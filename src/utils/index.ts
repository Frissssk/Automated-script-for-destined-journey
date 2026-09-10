/**
 * 工具函数模块
 * 提供通用的辅助函数
 */
import { klona } from 'klona';

/** 需要清理的注入 ID 列表 */
const InjectIdsToRemove = [
  '等级提升',
  'NPC等级提升',
  '主角种族',
  '当前所在地点',
  '当前时间',
  '事件提示',
  '性经验',
] as const;

/**
 * 清理旧的注入提示
 * 移除上一轮注入的信息，避免重复
 */
export const uninject = (): void => {
  uninjectPrompts([...InjectIdsToRemove]);
};

/**
 * 深拷贝并移除 Proxy 层
 * 用于将响应式数据存入酒馆变量
 */
export const deepClone = <T>(source_obj: T): T => {
  return klona(source_obj);
};

/**
 * 安全获取变量
 * 如果路径不存在则返回默认值
 */
export const safeGet = <T>(source_obj: unknown, path: string, default_value: T): T => {
  return _.get(source_obj, path, default_value) as T;
};

/**
 * 创建注入提示的工厂函数
 */
export const createPromptInjection = (
  prompt_id: string,
  prompt_content: string,
  options?: {
    position?: 'none' | 'in_chat';
    depth?: number;
    role?: 'system' | 'user' | 'assistant';
  }
): InjectionPrompt => {
  const { position = 'none', depth = 0, role = 'system' } = options ?? {};

  return {
    id: prompt_id,
    content: prompt_content,
    position,
    depth,
    role,
    should_scan: true,
  };
};

/**
 * 批量注入提示
 */
export const injectMultiplePrompts = (
  prompts: Array<{
    id: string;
    content: string;
    position?: 'none' | 'in_chat';
    depth?: number;
    role?: 'system' | 'user' | 'assistant';
  }>
): void => {
  const formattedPrompts = _.map(
    prompts,
    ({ id, content, position = 'none', depth = 0, role = 'system' }) =>
      createPromptInjection(id, content, { position, depth, role })
  );

  injectPrompts(formattedPrompts);
};

/**
 * 错误捕获包装器
 * 将函数包装为带错误处理的版本
 */
export const errorCatched = <T extends (...args: any[]) => any>(target_fn: T): T => {
  return ((...args: any[]) => {
    try {
      const result = target_fn(...args);
      if (result instanceof Promise) {
        return result.catch((error: Error) => {
          console.error(`[Script Error] ${target_fn.name || 'anonymous'}:`, error);
          throw error;
        });
      }
      return result;
    } catch (error) {
      console.error(`[Script Error] ${target_fn.name || 'anonymous'}:`, error);
      throw error;
    }
  }) as T;
};
