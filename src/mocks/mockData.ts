import type { ArchitectureRule } from '../types';

export const mockRules: ArchitectureRule[] = [
  { number: '01', title: 'Expected Result는 사람이 정의', description: 'Evaluator 출력을 정답으로 사용하지 않습니다.' },
  { number: '02', title: '단일 Application 실행', description: '하나의 TestRun은 하나의 Application Target을 실행합니다.' },
  { number: '03', title: '실행과 판정 상태 분리', description: 'Execution Error와 Assertion Failure는 서로 다릅니다.' },
  { number: '04', title: 'Evaluation Profile', description: '선택한 checks 전체에 하나의 strictness를 적용합니다.' },
  { number: '05', title: 'Quality Gate 별도 축', description: '실행 신뢰성이 부족하면 FAIL이 아닌 NOT_EVALUATED입니다.' },
];
