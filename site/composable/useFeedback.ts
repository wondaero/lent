import { onUnmounted, reactive } from 'vue';
import { ApiError } from '@site/services/error';

type Toast = { id: number; text: string; tone: 'default' | 'error' };
type ConfirmState = {
    open: boolean;
    title: string;
    message: string;
    confirmText: string;
    danger: boolean;
    resolve: ((ok: boolean) => void) | null;
};

// alert 대신 토스트, confirm 대신 모달 확인 창 (ToastHost 가 그림)
export const feedback = reactive({
    toasts: [] as Toast[],
    confirm: { open: false, title: '', message: '', confirmText: '확인', danger: false, resolve: null } as ConfirmState,
});

let seq = 0;

const ERROR_MESSAGES: Record<string, string> = {
    NETWORK_ERROR: '인터넷에 연결되지 않았어요. 연결을 확인해 주세요.',
};

export function toast(text: string, tone: Toast['tone'] = 'default') {
    const id = ++seq;
    feedback.toasts.push({ id, text, tone });
    setTimeout(() => {
        const idx = feedback.toasts.findIndex((t) => t.id === id);
        if (idx >= 0) {
            feedback.toasts.splice(idx, 1);
        }
    }, 2600);
}

export function errorCode(error: unknown) {
    return error instanceof ApiError ? error.message : '';
}

export function toastError(error: unknown) {
    toast(ERROR_MESSAGES[errorCode(error)] ?? '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.', 'error');
}

export function confirmDialog(options: { title: string; message?: string; confirmText?: string; danger?: boolean }) {
    // 이미 떠 있는 확인 창은 취소로 닫고 새로 띄움
    if (feedback.confirm.open) {
        closeConfirm(false);
    }

    return new Promise<boolean>((resolve) => {
        Object.assign(feedback.confirm, {
            open: true,
            title: options.title,
            message: options.message ?? '',
            confirmText: options.confirmText ?? '확인',
            danger: options.danger ?? false,
            resolve,
        });
    });
}

export function closeConfirm(ok: boolean) {
    feedback.confirm.resolve?.(ok);
    feedback.confirm.open = false;
    feedback.confirm.resolve = null;
}

// 확인 창을 띄우는 화면의 setup 에서 호출. 화면을 벗어나면(뒤로 가기 등) 떠 있는 확인 창을 취소로 닫음
export function closeConfirmOnUnmount() {
    onUnmounted(() => {
        if (feedback.confirm.open) {
            closeConfirm(false);
        }
    });
}
