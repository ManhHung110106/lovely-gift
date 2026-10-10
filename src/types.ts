export interface Recipient {
  id: string;
  name: string;
  account: string;
  photos: string[];
}
export interface Wish {
  id: string;
  recipientId: string;
  sender: string;
  message: string;
  order: number;
}
export interface GiftEvent {
  id: string;
  title: string;
  occasion: string;
  date: string;
  intro: string;
  videoUrl: string;
  musicUrl: string;
  theme: "rose" | "lavender";
  recipients: Recipient[];
  wishes: Wish[];
}
export interface GiftStore {
  version: 1;
  activeEventId: string;
  events: GiftEvent[];
  isDemo?: boolean;
}
export interface Snapshot {
  event: GiftEvent;
  recipient: Recipient;
}
declare global {
  interface Window {
    __GIFT_SNAPSHOT__?: Snapshot;
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}
