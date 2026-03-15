import { SalesGoals, ActivityGoal, ActivityType } from './types';

export const defaultActivityGoal: ActivityGoal = { daily: 10, weekly: 50, monthly: 200, enabled: true };

export const activityNames: Record<ActivityType, string> = {
  insta_msg: 'MSG Insta',
  insta_follow: 'Follow Insta',
  speech: 'Speeches',
  ligacoes: 'Ligações',
  insta_numbers: 'Números Insta',
  referidos: 'Referidos',
  meeting_scheduled: 'Reuniões Marcadas',
  meeting_done: 'Reuniões Realizadas'
};

export const defaultGoals: SalesGoals = {
  targets: {
    insta_msg: { ...defaultActivityGoal, daily: 50, weekly: 250, monthly: 1000 },
    insta_follow: { ...defaultActivityGoal, daily: 15, weekly: 75, monthly: 300 },
    speech: { ...defaultActivityGoal, daily: 2, weekly: 10, monthly: 40 },
    referidos: { ...defaultActivityGoal, daily: 5, weekly: 25, monthly: 100 },
    ligacoes: { ...defaultActivityGoal, daily: 20, weekly: 100, monthly: 400 },
    insta_numbers: { ...defaultActivityGoal, daily: 30, weekly: 150, monthly: 600 },
    meeting_scheduled: { ...defaultActivityGoal, daily: 5, weekly: 25, monthly: 100 },
    meeting_done: { ...defaultActivityGoal, daily: 2, weekly: 10, monthly: 40 }
  },
  activeDays: [1, 2, 3, 4, 5]
};
