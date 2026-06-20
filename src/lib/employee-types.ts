export type EmployeeType = "resistant" | "silent" | "emotional" | "perfunctory" | "ambitious";

export type Difficulty = "easy" | "medium" | "hard";

export interface EmployeeProfile {
  type: EmployeeType;
  name: string;
  title: string;
  avatarColor: string;
  avatarGradient: string;
  description: string;
  personalityTraits: string[];
  initialMood: string;
  difficulty: Difficulty;
  responseStyle: string;
  challengeLevel: string;
}

export const EMPLOYEE_PROFILES: Record<EmployeeType, EmployeeProfile> = {
  resistant: {
    type: "resistant",
    name: "王明",
    title: "抗拒型员工",
    avatarColor: "oklch(0.6 0.18 30)",
    avatarGradient: "from-orange-400 to-red-500",
    description: "工作能力尚可但自尊心强，面对负面反馈时容易产生防御心理，频繁反驳和质疑评价的公平性。",
    personalityTraits: ["防御心强", "频繁反驳", "质疑公平性", "找借口"],
    initialMood: "警惕、防备",
    difficulty: "hard",
    responseStyle: "直接、带攻击性、喜欢用反问句",
    challengeLevel: "高难度",
  },
  silent: {
    type: "silent",
    name: "李静",
    title: "沉默型员工",
    avatarColor: "oklch(0.55 0.05 240)",
    avatarGradient: "from-slate-400 to-slate-600",
    description: "工作踏实但不善表达，面谈时回答简短，不主动分享想法，需要引导才能打开话匣子。",
    personalityTraits: ["回答简短", "不主动表达", "回避深入话题", "内心戏多"],
    initialMood: "紧张、不安",
    difficulty: "medium",
    responseStyle: "简短、回避、需要多次追问",
    challengeLevel: "中难度",
  },
  emotional: {
    type: "emotional",
    name: "陈晓",
    title: "情绪型员工",
    avatarColor: "oklch(0.65 0.15 300)",
    avatarGradient: "from-purple-400 to-pink-500",
    description: "感性且容易情绪波动，面谈时可能哭泣、愤怒或焦虑，需要管理者具备较高的情绪管理能力。",
    personalityTraits: ["容易哭泣", "情绪波动大", "敏感脆弱", "需要安抚"],
    initialMood: "焦虑、敏感",
    difficulty: "hard",
    responseStyle: "情绪化、容易跑题、需要安抚",
    challengeLevel: "高难度",
  },
  perfunctory: {
    type: "perfunctory",
    name: "赵强",
    title: "敷衍型员工",
    avatarColor: "oklch(0.6 0.1 150)",
    avatarGradient: "from-teal-400 to-green-500",
    description: "表面配合但缺乏真实投入，口头认同却不做具体承诺，回应笼统，需要管理者推动其制定具体计划。",
    personalityTraits: ["表面认同", "缺乏承诺", "回应笼统", "不愿深入"],
    initialMood: "无所谓的态度",
    difficulty: "medium",
    responseStyle: "敷衍、笼统、表面配合",
    challengeLevel: "中难度",
  },
  ambitious: {
    type: "ambitious",
    name: "林雪",
    title: "进取型员工",
    avatarColor: "oklch(0.7 0.12 70)",
    avatarGradient: "from-amber-400 to-orange-500",
    description: "积极主动且目标感强，但有时目标不切实际，需要管理者帮助校准目标并引导思考资源约束。",
    personalityTraits: ["主动积极", "目标感强", "可能不切实际", "渴望认可"],
    initialMood: "兴奋、期待",
    difficulty: "easy",
    responseStyle: "积极、主动、但可能过于乐观",
    challengeLevel: "低难度",
  },
};

export const EMPLOYEE_LIST = Object.values(EMPLOYEE_PROFILES);
