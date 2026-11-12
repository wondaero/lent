// 공개 함수 호출 실패. message = 'NETWORK_ERROR'(서버에 닿지 못함) 또는 서버가 준 메시지
export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}
