import {
  Globe,
  MessageCircle,
  Scissors,
  Settings,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export type SetupGuideStep = {
  title: string;
  text: string;
  href: string;
  action: string;
  icon: LucideIcon;
};

export const setupGuideSteps: SetupGuideStep[] = [
  {
    title: "Dados e horários",
    text: "Nome, endereço, horário de funcionamento e link do site.",
    href: "/configuracoes",
    action: "Configurações",
    icon: Settings,
  },
  {
    title: "Serviços",
    text: "Corte, barba, combos — preço e duração.",
    href: "/servicos",
    action: "Serviços",
    icon: Scissors,
  },
  {
    title: "Barbeiros",
    text: "Cadastre a equipe que atende na barbearia.",
    href: "/funcionarios",
    action: "Funcionários",
    icon: UserCog,
  },
  {
    title: "WhatsApp",
    text: "Conecte para lembretes automáticos de agendamento.",
    href: "/whatsapp",
    action: "WhatsApp",
    icon: MessageCircle,
  },
  {
    title: "Site público",
    text: "Compartilhe o link para clientes agendarem online.",
    href: "/configuracoes",
    action: "Ver link",
    icon: Globe,
  },
];
