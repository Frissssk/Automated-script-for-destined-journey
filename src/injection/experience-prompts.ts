/**
 * 性经验注入模块
 * 将各伙伴的性经验 / XP 档案摘出并强调，
 * 供 AI 参考以调整角色对特定对象、种族、情景的态度与剧情走向
 */

import type { MessageVariables } from '../types';
import { injectMultiplePrompts, safeGet } from '../utils';

/** 单条 XP 档案 */
type XpArchiveEntry = {
  类型?: string;
  描述?: string;
  发现时间?: string;
  最后确认时间?: string;
  稳定度?: string;
};

/** 某个伙伴的性经验数据 */
type ExperienceData = {
  初吻?: { 对象?: string; 部位?: string; 时间?: string };
  口交?: number;
  性交?: number;
  手?: number;
  足?: number;
  初夜对象?: string;
  总经历次数?: number;
  最活跃性伴侣?: string;
  怀孕次数?: number;
  xp档案?: XpArchiveEntry[];
};

/** 该伙伴是否有值得注入的性经验数据（全空则跳过，避免空占上下文） */
const hasExperienceData = (experience: ExperienceData | undefined): boolean => {
  if (!experience || typeof experience !== 'object') return false;

  const counters = [
    experience.口交,
    experience.性交,
    experience.手,
    experience.足,
    experience.总经历次数,
    experience.怀孕次数,
  ];
  if (counters.some(value => Number(value) > 0)) return true;

  if (experience.初吻?.对象 || experience.初夜对象 || experience.最活跃性伴侣) return true;

  const archive = Array.isArray(experience.xp档案) ? experience.xp档案 : [];
  return archive.some(entry => Boolean(entry?.类型 || entry?.描述));
};

/** 将单个伙伴的性经验格式化为一行摘要 */
const formatPartnerExperience = (name: string, experience: ExperienceData): string => {
  const parts: string[] = [];

  const kiss = experience.初吻 ?? {};
  if (kiss.对象 || kiss.部位 || kiss.时间) {
    const parts_ofKiss = [
      kiss.对象 || '未知',
      kiss.部位 ? `(${kiss.部位})` : '',
      kiss.时间 ? `·${kiss.时间}` : '',
    ].join('');
    parts.push(`初吻:${parts_ofKiss}`);
  }

  parts.push(
    `经历:口交${Number(experience.口交) || 0}/性交${Number(experience.性交) || 0}` +
      `/手${Number(experience.手) || 0}/足${Number(experience.足) || 0}`
  );

  if (experience.初夜对象) parts.push(`初夜:${experience.初夜对象}`);
  if (experience.最活跃性伴侣) parts.push(`最活跃伴侣:${experience.最活跃性伴侣}`);
  if (Number(experience.怀孕次数) > 0) parts.push(`怀孕:${experience.怀孕次数}次`);

  const archive = (Array.isArray(experience.xp档案) ? experience.xp档案 : []).filter(entry =>
    Boolean(entry?.类型 || entry?.描述)
  );
  if (archive.length) {
    const items = archive.map(entry => {
      const type = entry.类型 || '未分类';
      const stability = entry.稳定度 ? `[${entry.稳定度}]` : '';
      return entry.描述 ? `${type}${stability}:${entry.描述}` : `${type}${stability}`;
    });
    parts.push(`XP档案:${items.join('；')}`);
  }

  return `「${name}」${parts.join('；')}`;
};

/**
 * 注入性经验信息
 * 仅注入存在数据的伙伴，合并为单条固定 id 的提示，便于每轮定向清理
 *
 * @param current_variables - 当前的变量数据
 */
export const injectExperiencePrompts = (current_variables: MessageVariables): void => {
  const partners = safeGet(
    current_variables,
    'stat_data.关系列表',
    {} as Record<string, { 性经验?: ExperienceData }>
  );

  const lines = Object.entries(partners)
    .filter(([, partner]) => hasExperienceData(partner?.性经验))
    .map(([name, partner]) => formatPartnerExperience(name, partner.性经验 as ExperienceData));

  if (!lines.length) return;

  const content = [
    '【性经验档案】以下信息用于影响角色对特定对象 / 种族 / 情景的态度与剧情走向：',
    ...lines,
  ].join('\n');

  injectMultiplePrompts([
    {
      id: '性经验',
      content,
      position: 'none',
      depth: 0,
      role: 'system',
    },
  ]);
};
