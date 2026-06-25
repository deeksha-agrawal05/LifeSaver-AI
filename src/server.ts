import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import { GoogleGenAI, Type } from "@google/genai";

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Support JSON request bodies
app.use(express.json());

// Lazy-loaded Google GenAI client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required but missing. Please configure it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

/**
 * AI API Endpoints
 */

// Generate subtasks and priority planner using Gemini
app.post('/api/ai/subtasks', async (req, res) => {
  try {
    const { title, description, deadline, urgency, calendarEvents } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const ai = getGeminiClient();
    const currentTime = new Date().toISOString();
    const calendarContext = calendarEvents && calendarEvents.length > 0 
      ? `Upcoming calendar events during this period: ${JSON.stringify(calendarEvents)}. Please ensure proposed subtasks account for these events and do not suggest working during busy calendar events.`
      : 'No busy calendar events reported.';

    const prompt = `You are LifeSaver AI, an expert productivity planner and cognitive scheduler.
Analyze the following newly created task:
- Title: "${title}"
- Description: "${description || 'No description provided'}"
- Deadline: "${deadline || 'No specific deadline provided'}"
- Urgency Input: "${urgency || 'medium'}"

${calendarContext}

Relative to the current reference time: ${currentTime}

Your job is to:
1. Decompose the main task into 3 to 5 actionable, manageable sequential subtasks.
2. Estimate the effort in minutes (e.g. 15, 30, 45, 60, 90) for each subtask.
3. Calculate an overall focus priority score from 0 to 100 (where 100 is absolute highest urgency and 0 is lowest) based on the closeness of the deadline, complexity of subtasks, and the input urgency level.
4. Formulate a concise, highly motivating, and professional recommendation reason (1-2 sentences) explaining the urgency/score and encouraging action.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are LifeSaver AI, a highly intelligent, encouraging, and objective productivity companion.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtasks: {
              type: Type.ARRAY,
              description: "Array of decomposed subtasks.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: "Concrete action item, e.g. 'Draft methodology paragraph' or 'Review staging logs'."
                  },
                  estimatedMinutes: {
                    type: Type.INTEGER,
                    description: "Estimated duration/effort required in minutes."
                  }
                },
                required: ["title", "estimatedMinutes"]
              }
            },
            priorityScore: {
              type: Type.INTEGER,
              description: "An overall calculated focus priority score from 0 to 100."
            },
            recommendationReason: {
              type: Type.STRING,
              description: "A supportive, professional explanation of the priority score."
            }
          },
          required: ["subtasks", "priorityScore", "recommendationReason"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('No text returned from Gemini API');
    }

    const plannerData = JSON.parse(text.trim());
    return res.json(plannerData);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in /api/ai/subtasks:', error);
    return res.status(500).json({ error: errMsg });
  }
});

// Calculate intelligent workload priorities
app.post('/api/ai/prioritize', async (req, res) => {
  try {
    const { tasks, calendarEvents } = req.body;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.json({ recommendations: [] });
    }

    const ai = getGeminiClient();
    const currentTime = new Date().toISOString();
    const calendarContext = calendarEvents && calendarEvents.length > 0
      ? `Upcoming calendar events during this period: ${JSON.stringify(calendarEvents)}. If a task deadline falls near or during these busy calendar events, its priority should be increased because the user has less free/available time to execute the task subtasks.`
      : '';

    const tasksPayload = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      deadline: t.deadline,
      urgency: t.urgency,
      status: t.status,
      subtasksCount: t.subtasks?.length || 0,
      completedSubtasksCount: t.subtasks?.filter((s: { completed?: boolean }) => !!s.completed).length || 0
    }));

    const prompt = `You are LifeSaver AI, an advanced productivity optimizer.
Analyze the following list of active tasks relative to the current time: ${currentTime}.
Tasks: ${JSON.stringify(tasksPayload)}

${calendarContext}

Your job is to recommend which tasks the user should focus on next to prevent missed deadlines.
Evaluate:
1. Closeness of the deadline (tasks with looming deadlines are prioritized, particularly within 24-48 hours).
2. Urgency level ('critical' or 'high' is more urgent than 'medium' or 'low').
3. Task workload (total and pending subtasks).
4. Status (only non-completed tasks 'pending' or 'in_progress' are focusable).

For each task in the list, compute a priority score from 0 to 100 (where 100 is absolute highest focus priority, and 0 is lowest or completed).
Also provide a supportive, clear, human-friendly "recommendationReason" explaining WHY the task has this score (e.g., "Critical: Deadline is in 2 hours, and you have 3 uncompleted steps! Start now.", "High priority: Medium urgency but deadline is approaching tomorrow morning.", or "Low priority: Ample time remaining (7 days)").
Return an array matching the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are LifeSaver AI, an objective, motivating productivity scheduler. Be direct but extremely helpful, prioritizing task safety.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              taskId: {
                type: Type.STRING,
                description: "The unique ID of the task."
              },
              priorityScore: {
                type: Type.INTEGER,
                description: "A calculated priority score from 0 to 100."
              },
              recommendationReason: {
                type: Type.STRING,
                description: "A concise, motivating explanation of why this priority score was assigned."
              }
            },
            required: ["taskId", "priorityScore", "recommendationReason"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('No text returned from Gemini API');
    }

    const recommendations = JSON.parse(text.trim());
    return res.json({ recommendations });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in /api/ai/prioritize:', error);
    return res.status(500).json({ error: errMsg });
  }
});

// Rescue Mode Endpoint
app.post('/api/ai/rescue', async (req, res) => {
  try {
    const { taskTitle, taskDescription, deadline, urgency, subtasks, currentTime, calendarEvents } = req.body;
    if (!taskTitle) {
      return res.status(400).json({ error: 'Task Title is required' });
    }

    const ai = getGeminiClient();
    const referenceTime = currentTime || new Date().toISOString();
    const calendarContext = calendarEvents && calendarEvents.length > 0
      ? `CRITICAL CALENDAR CONTEXT (Upcoming commitments before the deadline):
${JSON.stringify(calendarEvents)}
You MUST analyze these events. Do NOT schedule subtask execution during these busy calendar blocks. In the emergency completion plan, explicitly recommend working around these specific calendar events (referencing them by summary/name and times) and adjust the probability of missing the deadline upwards if these events severely restrict the user's available focus hours.`
      : 'No busy calendar commitments before the deadline.';

    const prompt = `You are LifeSaver AI, an expert emergency cognitive coordinator and tactical rescue assistant.
A user task is close to its deadline, and they are feeling overwhelmed! Perform a tactical rescue analysis.

Task Details:
- Title: "${taskTitle}"
- Description: "${taskDescription || 'No description provided'}"
- Urgency Input: "${urgency || 'medium'}"
- Target Deadline: "${deadline}"
- Reference Time: "${referenceTime}"

${calendarContext}

Here is the current step-by-step checklist of subtasks (some might be completed, some are pending):
${JSON.stringify(subtasks || [])}

Your job is to:
1. Analyze the remaining (uncompleted) subtasks and their estimated minutes vs. the actual available time remaining from the Reference Time to the Target Deadline.
2. Calculate the available time in minutes. (Reference Time to Target Deadline).
3. Generate a highly structured, ultra-actionable emergency completion plan (emergencyPlan) in markdown format. It should include tactical triage advice, what to skip or simplify, and a rapid step-by-step timeline that works around any busy calendar events listed above.
4. Show a calculated probability of missing the deadline as a percentage integer from 0 to 100 based on remaining effort in minutes, complexity, and available time.
5. Reorder the subtasks array to optimize sequence for maximum speed and efficacy. Keep completed subtasks in the list, but prioritize placing high-impact, critical, uncompleted steps first or in the most logical chronological sequence to secure the deadline.
6. Provide a concise recommendation explanation (1-2 sentences).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are LifeSaver AI, an emergency task-salvation advisor. You deliver clear, encouraging, hyper-practical advice and triage options.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emergencyPlan: {
              type: Type.STRING,
              description: "A detailed tactical emergency completion plan in Markdown format, with bullet points, time estimates, and triage suggestions."
            },
            probabilityOfMissing: {
              type: Type.INTEGER,
              description: "Calculated probability percentage (0 to 100) of missing the deadline."
            },
            reorderedSubtasks: {
              type: Type.ARRAY,
              description: "The complete list of subtasks, reordered chronologically/priority-wise for optimal urgent completion.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  completed: { type: Type.BOOLEAN },
                  estimatedMinutes: { type: Type.INTEGER }
                },
                required: ["id", "title", "completed", "estimatedMinutes"]
              }
            },
            recommendationReason: {
              type: Type.STRING,
              description: "A supportive, highly professional, direct assessment of the situation."
            }
          },
          required: ["emergencyPlan", "probabilityOfMissing", "reorderedSubtasks", "recommendationReason"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('No text returned from Gemini API');
    }

    const rescuePlanData = JSON.parse(text.trim());
    return res.json(rescuePlanData);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in /api/ai/rescue:', error);
    return res.status(500).json({ error: errMsg });
  }
});

// Accountability Agent Daily Audit Endpoint
app.post('/api/ai/accountability', async (req, res) => {
  try {
    const { tasks, userFeedback, currentTime } = req.body;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Active tasks are required for audit' });
    }

    const ai = getGeminiClient();
    const referenceTime = currentTime || new Date().toISOString();

    const prompt = `You are LifeSaver AI's dedicated Accountability Agent.
Your job is to audit the user's progress, help them address overdue deadlines, identify blockers, suggest micro next actions, and automatically update task priority scores.

Current Reference Time: ${referenceTime}

Active Tasks currently scheduled in the user's workspace:
${JSON.stringify(tasks.map(t => ({
  id: t.id,
  title: t.title,
  description: t.description,
  deadline: t.deadline,
  urgency: t.urgency,
  status: t.status,
  progress: t.progress,
  subtasksCount: t.subtasks?.length || 0,
  completedSubtasksCount: t.subtasks?.filter((s: { completed?: boolean }) => !!s.completed).length || 0
})))}

User Progress Updates and Blockers for these tasks:
${JSON.stringify(userFeedback || [])}

Perform an audit based on this feedback:
1. Identify overdue tasks (where deadline is earlier than current reference time) and tasks that are slipping behind.
2. Address user's stated progress updates.
3. For each task's reported blocker (e.g., procrastination, lack of clarity, technical difficulty, overwhelmed, lack of energy):
   - Provide highly empathetic, direct, actionable advice.
   - Suggest a concrete "suggestedNextAction" which MUST be a small, highly achievable, low-friction micro-task that takes under 15 minutes to complete (to break inertia).
4. Automatically recalculate each task's focus priorityScore (0-100 scale). Increase priority for overdue tasks or tasks with severe blockers that require immediate intervention.
5. Suggest whether urgency should be adjusted ('low', 'medium', 'high', 'critical').
6. Provide a consolidated, highly motivating overall progress assessment (generalAssessment) in Markdown format. Be encouraging but firm about tackling overdue milestones today.

Return the response conforming exactly to the responseSchema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are LifeSaver AI's Accountability Agent. You are firm, extremely supportive, empathetic, and expert at breaking down procrastination with low-friction micro-actions.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            generalAssessment: {
              type: Type.STRING,
              description: "An encouraging, motivating consolidated audit report (Markdown) addressing overdue tasks, progress made, and advice on overcoming active blockers."
            },
            taskUpdates: {
              type: Type.ARRAY,
              description: "Array of task updates with recalculated priority scores, adjusted urgencies, and highly practical next actions.",
              items: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.STRING },
                  updatedPriorityScore: { type: Type.INTEGER, description: "A recalculated priority score from 0 to 100 based on urgency, blockers, and overdue status." },
                  updatedUrgency: { type: Type.STRING, description: "Urgency level ('low', 'medium', 'high', or 'critical') matching user's slipping timeline." },
                  suggestedNextAction: { type: Type.STRING, description: "A very specific, low-friction micro-action taking less than 15 minutes to complete (e.g. 'Read the first 3 lines' or 'Draft email template')." },
                  actionEstMinutes: { type: Type.INTEGER, description: "Estimated completion time in minutes (must be between 5 and 15 minutes)." },
                  recommendationReason: { type: Type.STRING, description: "Supportive reason explaining why this priority score and micro-action were chosen." }
                },
                required: ["taskId", "updatedPriorityScore", "updatedUrgency", "suggestedNextAction", "actionEstMinutes", "recommendationReason"]
              }
            }
          },
          required: ["generalAssessment", "taskUpdates"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('No assessment text returned from Gemini');
    }

    const accountabilityData = JSON.parse(text.trim());
    return res.json(accountabilityData);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in /api/ai/accountability:', error);
    return res.status(500).json({ error: errMsg });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
