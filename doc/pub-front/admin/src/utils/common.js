export function formatToKST(date) {
    if (!date) return ''; // null, undefined, 빈 문자열 등
    const d = new Date(date);
    if (isNaN(d.getTime())) return ''; // 유효하지 않은 날짜
    return d.toLocaleString("ko-KR");
}

export function today(){
    const today = new Date();
    const year = today.getFullYear();      // 2025
    const month = String(today.getMonth() + 1).padStart(2, "0"); // 10 (0부터 시작하니까 +1)
    const day = String(today.getDate()).padStart(2, "0"); // 02
    
    const formatted = `${year}-${month}-${day}`;
    
    return formatted;
}
