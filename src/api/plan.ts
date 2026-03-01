import type { LanguageCode } from '../i18n/languages'

export interface PlannerContext {
    lang: LanguageCode
    isRTL: boolean
    dateISO: string
    userStats: {
        solvedTotal: number
        solvedLast7Days: number
        difficultyBreakdownLast20: { easy: number; medium: number; hard: number }
        recentTopicsTop5: string[]
        recentLanguagesTop3: string[]
    }
    preferences: {
        sessionLengthMinutes: number
        focus: 'foundation' | 'placement' | 'speed' | 'sql' | 'mixed'
    }
}

export interface PlanTask {
    id: 't1' | 't2' | 't3' | 't4' | 't5'
    label: string
    detail: string
    estimatedMinutes: number
    effort: 1 | 2 | 3 | 4 | 5
    kind: 'solve_problem' | 'write_tests' | 'review_mistake' | 'read_solution' | 'revise_notes' | 'micro_drill'
    recommended: {
        problemId: string | null
        language: 'python' | 'javascript' | 'java' | 'cpp' | 'sql' | null
        topicIds: string[]
    }
    panel: {
        why: string
        definitionOfDone: string[]
        nextAction: {
            type: 'open_problem' | 'open_filtered_problems' | 'open_session' | 'open_insights'
            label: string
            href: string
        }
    }
}

export interface PlanResponse {
    planId: string
    title: string
    subtitle: string
    tasks: PlanTask[]
    scoring: {
        targetEffortScore: number
        note: string
    }
}

export async function generatePlan(context: PlannerContext): Promise<PlanResponse> {
    // Mock endpoint for now since we are frontend-heavy / dev mode
    // In production, this would be a fetch to /api/plan

    // Deterministic fallback generator
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const isReentry = context.userStats.solvedLast7Days === 0

    if (isReentry) {
        return {
            planId: `${context.dateISO}::m0ckRe`,
            title: context.lang === 'en' ? 'Easing Back In' : 'دوبارہ شروعات',
            subtitle: context.lang === 'en' ? 'Let\'s start with a gentle warm-up today.' : 'آج ایک ہلکی شروعات کرتے ہیں۔',
            tasks: [
                {
                    id: 't1',
                    label: context.lang === 'en' ? 'Warm up with an Easy problem' : 'ورم اپ کریں (Easy)',
                    detail: context.lang === 'en' ? 'Get back into the groove with a familiar concept.' : 'پہچانے ہوئے سوال سے دوبارہ شروع کریں۔',
                    estimatedMinutes: 10,
                    effort: 1,
                    kind: 'solve_problem',
                    recommended: {
                        problemId: null,
                        language: context.preferences.focus === 'sql' ? 'sql' : (context.userStats.recentLanguagesTop3[0] as any ?? 'python'),
                        topicIds: context.userStats.recentTopicsTop5.slice(0, 1),
                    },
                    panel: {
                        why: context.lang === 'en' ? 'Starting with an easy problem builds confidence after a break.' : 'آسان سوال سے شروع کرنے سے اعتماد بڑھتا ہے۔',
                        definitionOfDone: [
                            context.lang === 'en' ? 'Read the problem statement completely.' : 'سوال کو پوری طرح پڑھیں۔',
                            context.lang === 'en' ? 'Write a simple solution.' : 'جواب لکھیں۔',
                            context.lang === 'en' ? 'Pass all testcases.' : 'ٹیسٹ پاس کریں۔'
                        ],
                        nextAction: {
                            type: 'open_filtered_problems',
                            label: context.lang === 'en' ? 'Find an Easy problem' : 'آسان سوال تلاش کریں',
                            href: '/problems?difficulty=EASY'
                        }
                    }
                },
                {
                    id: 't2',
                    label: context.lang === 'en' ? 'Review a past mistake' : 'پچھلی غلطی کا جائزہ لیں',
                    detail: context.lang === 'en' ? 'Refresh your memory on a tricky concept.' : 'کسی مشکل تصور کو یاد کریں۔',
                    estimatedMinutes: 5,
                    effort: 1,
                    kind: 'review_mistake',
                    recommended: {
                        problemId: null,
                        language: null,
                        topicIds: []
                    },
                    panel: {
                        why: context.lang === 'en' ? 'Reviewing what tripped you up last time helps solidify learning.' : 'اپنی غلطیوں کا جائزہ لینے سے سیکھنا پختہ ہوتا ہے۔',
                        definitionOfDone: [
                            context.lang === 'en' ? 'Identify why a past testcase failed.' : 'پہچانیں کہ پچھلا ٹیسٹ کیوں فیل ہوا۔',
                            context.lang === 'en' ? 'Note the correct approach.' : 'صحیح طریقہ نوٹ کریں۔'
                        ],
                        nextAction: {
                            type: 'open_insights',
                            label: context.lang === 'en' ? 'View Insights' : 'بصیرت دیکھیں',
                            href: '/insights'
                        }
                    }
                },
                {
                    id: 't3',
                    label: context.lang === 'en' ? 'Read one solution' : 'ایک حل پڑھیں',
                    detail: context.lang === 'en' ? 'Learn from the community.' : 'کمیونٹی سے سیکھیں۔',
                    estimatedMinutes: 10,
                    effort: 1,
                    kind: 'read_solution',
                    recommended: {
                        problemId: null,
                        language: null,
                        topicIds: []
                    },
                    panel: {
                        why: context.lang === 'en' ? 'Reading others’ code exposes you to new patterns.' : 'دوسروں کا کوڈ پڑھنے سے نئے طریقے سیکھنے کو ملتے ہیں۔',
                        definitionOfDone: [
                            context.lang === 'en' ? 'Find a highly-rated solution.' : 'ایک بہترین حل تلاش کریں۔',
                            context.lang === 'en' ? 'Understand its time complexity.' : 'اس کی ٹائم کمپلیکسٹی سمجھیں۔'
                        ],
                        nextAction: {
                            type: 'open_filtered_problems',
                            label: context.lang === 'en' ? 'Explore Problems' : 'سوالات کھوجیں',
                            href: '/problems'
                        }
                    }
                }
            ],
            scoring: {
                targetEffortScore: 40,
                note: context.lang === 'en' ? 'Just showing up is half the battle!' : 'صرف آ جانا ہی آدھی کامیابی ہے!'
            }
        }
    }

    return {
        planId: `${context.dateISO}::m0ckStd`,
        title: context.lang === 'en' ? 'Your Daily Plan' : 'آپ کا روزانہ کا منصوبہ',
        subtitle: context.lang === 'en' ? 'Focused on steady progress.' : 'مسلسل ترقی پر توجہ مرکوز کریں۔',
        tasks: [
            {
                id: 't1',
                label: context.lang === 'en' ? 'Solve a new problem' : 'نیا سوال حل کریں',
                detail: context.lang === 'en' ? 'Apply your current knowledge to a fresh challenge.' : 'اپنے علم کو نئے چیلنج پر استعمال کریں۔',
                estimatedMinutes: 20,
                effort: 3,
                kind: 'solve_problem',
                recommended: {
                    problemId: null,
                    language: null,
                    topicIds: context.userStats.recentTopicsTop5.slice(0, 1)
                },
                panel: {
                    why: context.lang === 'en' ? 'Consistent practice builds problem-solving intuition.' : 'مسلسل مشق سے مسائل حل کرنے کی صلاحیت بڑھتی ہے۔',
                    definitionOfDone: [
                        context.lang === 'en' ? 'Understand the constraints.' : 'شرائط کو سمجھیں۔',
                        context.lang === 'en' ? 'Implement a working solution.' : 'کام کرنے والا حل بنائیں۔'
                    ],
                    nextAction: {
                        type: 'open_filtered_problems',
                        label: context.lang === 'en' ? 'Explore Problems' : 'سوالات کھوجیں',
                        href: '/problems'
                    }
                }
            },
            {
                id: 't2',
                label: context.lang === 'en' ? 'Review past mistakes' : 'پچھلی غلطیوں کا جائزہ لیں',
                detail: context.lang === 'en' ? 'Learn from recent incorrect submissions.' : 'حالیہ غلطیوں سے سیکھیں۔',
                estimatedMinutes: 10,
                effort: 2,
                kind: 'review_mistake',
                recommended: {
                    problemId: null,
                    language: null,
                    topicIds: []
                },
                panel: {
                    why: context.lang === 'en' ? 'Reviewing mistakes is the fastest way to improve.' : 'غلطیوں کا جائزہ لینا بہتری کا تیز ترین طریقہ ہے۔',
                    definitionOfDone: [
                        context.lang === 'en' ? 'Identify why a testcase failed.' : 'پہچانیں کہ ٹیسٹ کیوں فیل ہوا۔',
                        context.lang === 'en' ? 'Write down the correct approach.' : 'صحیح طریقہ لکھیں۔'
                    ],
                    nextAction: {
                        type: 'open_insights',
                        label: context.lang === 'en' ? 'View Insights' : 'بصیرت دیکھیں',
                        href: '/insights'
                    }
                }
            },
            {
                id: 't3',
                label: context.lang === 'en' ? 'Micro-drill' : 'چھوٹی مشق',
                detail: context.lang === 'en' ? 'Practice a specific syntax or API.' : 'مخصوص کوڈ کی مشق کریں۔',
                estimatedMinutes: 5,
                effort: 1,
                kind: 'micro_drill',
                recommended: {
                    problemId: null,
                    language: null,
                    topicIds: []
                },
                panel: {
                    why: context.lang === 'en' ? 'Fluency in primitives frees up cognitive load.' : 'بنیادی باتوں میں روانی دماغی بوجھ کم کرتی ہے۔',
                    definitionOfDone: [
                        context.lang === 'en' ? 'Recall the syntax without searching.' : 'بغیر تلاش کیے کوڈ یاد کریں۔'
                    ],
                    nextAction: {
                        type: 'open_filtered_problems',
                        label: context.lang === 'en' ? 'Continue' : 'جاری رکھیں',
                        href: '/problems'
                    }
                }
            }
        ],
        scoring: {
            targetEffortScore: 60,
            note: context.lang === 'en' ? 'Consistency over intensity!' : 'مستقل مزاجی شدت سے بہتر ہے!'
        }
    }
}
