import en from "@/lib/i18n/messages/en.json";

type Messages = typeof en;

declare global {
  interface IntlMessages extends Messages {}
}
