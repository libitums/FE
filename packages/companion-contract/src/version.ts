/**
 * 이 패키지가 정한 계약의 판입니다. 필드를 더하는 변경은 올리지 않고, 필드 삭제 · 의미 변경 · 이벤트 순서 변경 때만
 * 올립니다(`docs/specs/ai-companion-api.md` §1.3).
 */
export const CONTRACT_VERSION = 1;

/** 서버가 받는 계약 판들입니다. 요청의 `contract_version`이 여기 없으면 `unsupported_contract_version`입니다. */
export const SUPPORTED_CONTRACT_VERSIONS: readonly number[] = [CONTRACT_VERSION];
