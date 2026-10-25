import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  ArrowUpRight01Icon,
  Briefcase01Icon,
  Cancel01Icon,
  ClapperboardIcon,
  Copy01Icon,
  DiscIcon,
  GridViewIcon,
  Mail01Icon,
  Moon02Icon,
  PauseIcon,
  PlayIcon,
  Remove01Icon,
  Restaurant01Icon,
  Saturn01Icon,
  Search01Icon,
  ShuffleIcon,
  Sun03Icon,
  Tick02Icon,
  UniversityIcon,
  VolumeHighIcon,
} from "@hugeicons/core-free-icons";

const icons = {
  home: Saturn01Icon,
  work: Briefcase01Icon,
  education: UniversityIcon,
  viper: DiscIcon,
  anime: ClapperboardIcon,
  contact: Mail01Icon,
  food: Restaurant01Icon,
  arrow: ArrowRight02Icon,
  "arrow-left": ArrowLeft02Icon,
  "arrow-up-right": ArrowUpRight01Icon,
  close: Cancel01Icon,
  sound: VolumeHighIcon,
  sun: Sun03Icon,
  moon: Moon02Icon,
  map: GridViewIcon,
  play: PlayIcon,
  pause: PauseIcon,
  search: Search01Icon,
  shuffle: ShuffleIcon,
  check: Tick02Icon,
  plus: Add01Icon,
  minus: Remove01Icon,
  copy: Copy01Icon,
};

export type IconName = keyof typeof icons;

/** UI icons are decorative; their buttons and links provide accessible names. */
export default function Icon({
  name,
  size = 22,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <HugeiconsIcon
      icon={icons[name]}
      size={size}
      strokeWidth={1.6}
      color="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
      data-icon={name}
    />
  );
}
