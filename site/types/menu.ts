export interface Menu {
    url: string;
    title: string;
    target?: "_blank",
    children?: Menu[];
}
