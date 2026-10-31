import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>
}

export const SearchIcon = (props: IconProps) => <Icon {...props}><circle cx="10.8" cy="10.8" r="6.6" /><path d="m16 16 4.6 4.6" /></Icon>
export const ArrowRightIcon = (props: IconProps) => <Icon {...props}><path d="M4.5 12h15M13.5 6l6 6-6 6" /></Icon>
export const ChevronDownIcon = (props: IconProps) => <Icon {...props}><path d="m6 9 6 6 6-6" /></Icon>
export const MenuIcon = (props: IconProps) => <Icon {...props}><path d="M4 6.5h16M4 12h16M4 17.5h16" /></Icon>
export const TruckIcon = (props: IconProps) => <Icon {...props}><path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3.2v2.8h-7" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="16.8" cy="17.5" r="1.8" /><path d="M1 9.5h4M1.8 12h3" /></Icon>
export const ShieldIcon = (props: IconProps) => <Icon {...props}><path d="M12 2.8 19.5 5.6v5.8c0 4.6-3.1 8.2-7.5 9.8-4.4-1.6-7.5-5.2-7.5-9.8V5.6z" /><path d="m8.6 12 2.4 2.4 4.6-4.8" /></Icon>
export const HeadsetIcon = (props: IconProps) => <Icon {...props}><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13" width="4" height="6.5" rx="1.6" /><rect x="17" y="13" width="4" height="6.5" rx="1.6" /><path d="M19 19.5c0 1.4-1.6 2-4 2h-2" /></Icon>
export const CardIcon = (props: IconProps) => <Icon {...props}><rect x="2.5" y="5" width="19" height="14" rx="2.2" /><path d="M2.5 9.5h19M6 15h4" /></Icon>
export const PhoneIcon = (props: IconProps) => <Icon {...props}><path d="M5.2 3.5h3.3l1.6 4.2-2 1.3a11 11 0 0 0 6.9 6.9l1.3-2 4.2 1.6v3.3a1.8 1.8 0 0 1-2 1.8A16.6 16.6 0 0 1 3.4 5.5a1.8 1.8 0 0 1 1.8-2Z" /></Icon>
export const HelpIcon = (props: IconProps) => <Icon {...props}><circle cx="12" cy="12" r="8.8" /><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 3.6M12 17.2h.01" /></Icon>
export const CartIcon = (props: IconProps) => <Icon {...props}><path d="M2.5 3.5h2.6l2.3 11.2h11l2-7.7H6.2" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></Icon>
export const HeartIcon = (props: IconProps) => <Icon {...props}><path d="M12 20.2s-7.8-4.6-7.8-10.3A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.8 2.6c0 5.7-7.8 10.3-7.8 10.3Z" /></Icon>
export const LaptopIcon = (props: IconProps) => <Icon {...props}><rect x="4.5" y="5" width="15" height="10" rx="1.2" /><path d="M2.5 18.5h19l-1.6-3.5H4.1z" /></Icon>
export const GamepadIcon = (props: IconProps) => <Icon {...props}><path d="M7.2 7.5h9.6a4 4 0 0 1 3.9 3.2l.8 4.6a2.4 2.4 0 0 1-4.2 2l-1.8-2.1H8.5l-1.8 2.1a2.4 2.4 0 0 1-4.2-2l.8-4.6a4 4 0 0 1 3.9-3.2Z" /><path d="M8 10v3M6.5 11.5h3M15.5 11h.01M17.5 12.5h.01" /></Icon>
export const BriefcaseIcon = (props: IconProps) => <Icon {...props}><rect x="3" y="7" width="18" height="12.5" rx="2" /><path d="M9 7V5.2h6V7M3 12.5h18" /></Icon>
export const CpuIcon = (props: IconProps) => <Icon {...props}><rect x="6" y="6" width="12" height="12" rx="1.6" /><rect x="9.5" y="9.5" width="5" height="5" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></Icon>
export const MouseIcon = (props: IconProps) => <Icon {...props}><rect x="6.5" y="3" width="11" height="18" rx="5.5" /><path d="M12 3v6M12 6.2v1.6" /></Icon>
export const GraduationIcon = (props: IconProps) => <Icon {...props}><path d="m2.5 9 9.5-4.5L21.5 9 12 13.5z" /><path d="M6.5 11v4.5c1.6 1.6 3.4 2.3 5.5 2.3s3.9-.7 5.5-2.3V11M21.5 9v5" /></Icon>
export const TagIcon = (props: IconProps) => <Icon {...props}><path d="M3.5 12.4V4.5a1 1 0 0 1 1-1h7.9l8.6 8.6a1.4 1.4 0 0 1 0 2l-6.9 6.9a1.4 1.4 0 0 1-2 0z" /><circle cx="8" cy="8" r="1.4" /></Icon>
export const MailIcon = (props: IconProps) => <Icon {...props}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.8 6.2 8.2 6.3 8.2-6.3" /></Icon>

export function WhatsAppIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M20.1 3.9A11.3 11.3 0 0 0 2.3 17.5L1 23l5.6-1.3A11.3 11.3 0 0 0 20.1 3.9ZM12 20.7a9.3 9.3 0 0 1-4.7-1.3l-.3-.2-3.3.8.9-3.2-.2-.3A9.3 9.3 0 1 1 12 20.7Zm5.1-7c-.3-.2-1.7-.9-2-.9s-.5-.2-.7.2-.8.9-1 1.1-.4.2-.7.1a7.6 7.6 0 0 1-2.2-1.4 8.3 8.3 0 0 1-1.5-1.9c-.2-.3 0-.5.2-.7l.5-.6.2-.5-.1-.5c-.1-.2-.7-1.6-1-2.1-.2-.5-.5-.4-.7-.4H7.5c-.2 0-.5.1-.8.4s-1 1-1 2.3 1 2.6 1.1 2.8c.2.2 2 3.1 4.9 4.4.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3Z" /></svg>
}
export const GpuIcon = (props: IconProps) => <Icon {...props}><rect x="2.5" y="6.5" width="19" height="10" rx="1.6" /><circle cx="9" cy="11.5" r="2.6" /><path d="M15 9.5h3.5M15 12h3.5M15 14.5h2M5 16.5v2.5M8 16.5v2.5" /></Icon>
