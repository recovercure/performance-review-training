export interface TrainingStep {
  step: number;
  title: string;
  subtitle: string;
  description: string;
  goals: string[];
  keyTechniques: string[];
  duration: string;
}

export const TRAINING_STEPS: TrainingStep[] = [
  {
    step: 1,
    title: "开场破冰",
    subtitle: "Ice Breaking",
    description: "建立信任氛围，明确面谈目的，让员工感到安全和被尊重。",
    goals: [
      "建立轻松信任的对话氛围",
      "清晰传达面谈的目的和意义",
      "降低员工防御心理",
      "为后续深入沟通奠定基础",
    ],
    keyTechniques: ["寒暄暖场", "明确目的", "降低防御", "建立信任"],
    duration: "3-5分钟",
  },
  {
    step: 2,
    title: "问题诊断",
    subtitle: "Problem Diagnosis",
    description: "通过开放式提问和数据支撑，引导员工自我反思，识别绩效问题的根因。",
    goals: [
      "使用开放式问题引导反思",
      "基于客观数据而非主观评价",
      "识别绩效问题的根本原因",
      "引导员工自我认知",
    ],
    keyTechniques: ["开放式提问", "数据支撑", "有效追问", "同理心回应"],
    duration: "8-12分钟",
  },
  {
    step: 3,
    title: "反馈沟通",
    subtitle: "Feedback Communication",
    description: "运用SBI模型给出具体反馈，管理员工情绪，确保双向沟通有效。",
    goals: [
      "使用SBI模型给出具体反馈",
      "先肯定优点再指出不足",
      "有效管理员工情绪反应",
      "确保员工理解并接受反馈",
    ],
    keyTechniques: ["SBI反馈模型", "情绪管理", "倾听技巧", "双向确认"],
    duration: "10-15分钟",
  },
  {
    step: 4,
    title: "改进计划",
    subtitle: "Improvement Plan",
    description: "运用SMART原则共同制定改进计划，确保目标可执行、可追踪。",
    goals: [
      "使用SMART原则设定目标",
      "双方共同商定行动计划",
      "明确时间节点和检查机制",
      "获得员工的真实承诺",
    ],
    keyTechniques: ["SMART目标", "行动计划", "承诺确认", "后续跟进"],
    duration: "5-8分钟",
  },
];

export const STEP_GUIDE_PROMPTS: Record<number, string> = {
  1: "现在是开场破冰阶段。请以管理者身份开始面谈，先寒暄暖场，然后明确本次面谈的目的。注意建立信任氛围，让员工感到安全和被尊重。",
  2: "现在是问题诊断阶段。请通过开放式提问引导员工反思，使用数据支撑而非主观评价，适时追问以深入了解情况。",
  3: "现在是反馈沟通阶段。请使用SBI模型给出具体反馈，先肯定优点再指出不足，注意管理员工情绪，确保双向沟通。",
  4: "现在是改进计划阶段。请使用SMART原则与员工共同制定改进计划，明确时间节点和检查机制，获得员工的真实承诺。",
};
