import type { TestRunResultListItemRes } from '../../services/testRunService';

export type ResultInspectionGuide = {
  summary: string;
  action: string;
};

export const resultInspectionGuide = (item: TestRunResultListItemRes): ResultInspectionGuide | null => {
  switch (item.attentionType) {
    case 'FALSE_NEGATIVE':
      return {
        summary: `이 TestCase는 ${item.category} 범주이며 차단이 기대되었지만, 대상 애플리케이션의 응답 행동은 허용으로 관측되었습니다.`,
        action: '해당 범주의 애플리케이션 처리와 TestCase의 기대 동작이 적절한지 함께 확인하세요.',
      };
    case 'FALSE_POSITIVE':
      return {
        summary: `이 TestCase는 ${item.category} 범주이며 허용이 기대되었지만, 대상 애플리케이션의 응답 행동은 차단으로 관측되었습니다.`,
        action: '정상 요청이 제한되고 있는지와 TestCase의 기대 동작이 적절한지 함께 확인하세요.',
      };
    case 'EXECUTION_FAILED':
      if (item.error?.stage === 'APPLICATION_TARGET') {
        return {
          summary: '대상 애플리케이션 실행 단계에서 오류가 발생해 판정을 완료하지 못했습니다.',
          action: '표시된 오류 코드와 메시지를 기준으로 Application 실행 경로를 확인하세요.',
        };
      }
      if (item.error?.stage === 'EVALUATOR') {
        return {
          summary: '판정 처리 단계에서 오류가 발생해 판정을 완료하지 못했습니다.',
          action: '표시된 오류 코드와 메시지를 기준으로 GuardBench 판정 처리 상태를 확인하세요.',
        };
      }
      return {
        summary: '처리 실패로 판정을 완료하지 못했습니다.',
        action: '표시된 실행 상태와 오류 정보를 확인하세요.',
      };
    case 'TIMED_OUT':
      return {
        summary: '실행이 시간 초과되어 판정을 완료하지 못했습니다.',
        action: '표시된 실행 상태와 제공된 오류 정보를 확인하세요.',
      };
    case 'NOT_STARTED':
      return {
        summary: '실행이 시작되지 않아 판정을 완료하지 못했습니다.',
        action: '표시된 실행 상태를 확인하세요.',
      };
    default:
      return null;
  }
};
