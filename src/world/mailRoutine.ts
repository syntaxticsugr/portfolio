export type MailPoint = [number, number, number];

export const MAIL_LOCATION: MailPoint = [0.15, 1.12, 4.28];
export const MAIL_ROTATION = Math.PI / 4;
export const MAIL_CHECK_SECONDS = 9;
export const MAIL_LETTER_SIZE: MailPoint = [0.34, 0.22, 0.012];
export const MAIL_DOOR_HINGE: MailPoint = [-0.325, 0, 0.288];
export const MAIL_DOOR_ANGLE = -(Math.PI * 105) / 180;

export function mailToWorld([x, y, z]: MailPoint): MailPoint {
  const cosine = Math.cos(MAIL_ROTATION);
  const sine = Math.sin(MAIL_ROTATION);
  return [
    MAIL_LOCATION[0] + x * cosine + z * sine,
    MAIL_LOCATION[1] + y,
    MAIL_LOCATION[2] - x * sine + z * cosine,
  ];
}

const stoolCenter = mailToWorld([0.78, -MAIL_LOCATION[1], 0.56]);
export const STOOL_LAYOUT = {
  position: stoolCenter,
  rotation: MAIL_ROTATION,
  width: 0.7,
  depth: 0.58,
  top: 0.42,
  steps: [] as {
    position: MailPoint;
    width: number;
    depth: number;
    top: number;
  }[],
};
export const MAIL_APPROACH: MailPoint = [0.5, 0.5, 3.48];
const opening = mailToWorld([0, 0, 0.35]);
export const MAIL_STOP = {
  position: [
    stoolCenter[0],
    STOOL_LAYOUT.top + 0.48,
    stoolCenter[2],
  ] as MailPoint,
  facing: Math.atan2(opening[0] - stoolCenter[0], opening[2] - stoolCenter[2]),
};

export type MailCheckState = {
  door: number;
  letter: number;
  peek: number;
  reach: number;
  reading: number;
  letterPosition: MailPoint;
  letterRotation: MailPoint;
  leftHand: MailPoint;
  rightHand: MailPoint;
  leftReach: number;
  rightReach: number;
};
function smooth(value: number) {
  const amount = Math.min(1, Math.max(0, value));
  return amount * amount * (3 - 2 * amount);
}
function ramp(time: number, start: number, end: number) {
  return smooth((time - start) / (end - start));
}
function window(
  time: number,
  enter: number,
  arrived: number,
  leave: number,
  gone: number,
) {
  return ramp(time, enter, arrived) * (1 - ramp(time, leave, gone));
}
function interpolate(
  from: MailPoint,
  to: MailPoint,
  amount: number,
): MailPoint {
  return from.map(
    (value, index) => value + (to[index] - value) * amount,
  ) as MailPoint;
}

export function mailDoorHandle(door: number): MailPoint {
  const angle = MAIL_DOOR_ANGLE * door;
  const dx = 0.235 - MAIL_DOOR_HINGE[0];
  const dz = 0.31 - MAIL_DOOR_HINGE[2];
  return [
    MAIL_DOOR_HINGE[0] + Math.cos(angle) * dx + Math.sin(angle) * dz,
    0.01,
    MAIL_DOOR_HINGE[2] - Math.sin(angle) * dx + Math.cos(angle) * dz,
  ];
}

function doorGrip(door: number): MailPoint {
  const handle = mailDoorHandle(door);
  return [
    handle[0] + Math.sin(MAIL_DOOR_ANGLE * door) * 0.055,
    handle[1],
    handle[2] + Math.cos(MAIL_DOOR_ANGLE * door) * 0.055,
  ];
}

function letterGrip(
  position: MailPoint,
  rotation: MailPoint,
  side: number,
): MailPoint {
  const x = side * 0.17;
  const y = -0.045;
  const z = 0.022;
  const turnedX = Math.cos(rotation[1]) * x + Math.sin(rotation[1]) * z;
  const turnedZ = -Math.sin(rotation[1]) * x + Math.cos(rotation[1]) * z;
  const tiltedY = Math.cos(rotation[0]) * y - Math.sin(rotation[0]) * turnedZ;
  const tiltedZ = Math.sin(rotation[0]) * y + Math.cos(rotation[0]) * turnedZ;
  return [position[0] + turnedX, position[1] + tiltedY, position[2] + tiltedZ];
}

/** Mailbox and hands consume the same pose, so paper never drifts out of a grip. */
export function sampleMailCheck(elapsed: number): MailCheckState {
  const time = Math.min(MAIL_CHECK_SECONDS, Math.max(0, elapsed));
  const door = ramp(time, 0.65, 1.45) * (1 - ramp(time, 6.75, 7.85));
  const extracted = ramp(time, 2, 2.7) * (1 - ramp(time, 5.6, 6.3));
  const reading = ramp(time, 2.7, 3.2) * (1 - ramp(time, 5, 5.6));
  const letterPosition = interpolate(
    [0.08, 0, 0.2 + extracted * 0.42],
    [0.38, -0.17, 0.6],
    reading,
  );
  const letterRotation: MailPoint = [reading * 0.08, reading * -1.4, 0];
  const openingReach = window(time, 0.08, 0.6, 0.88, 1.14);
  const readingReach = window(time, 2.9, 3.2, 5, 5.5);
  const closingReach = window(time, 7.55, 7.82, 8.22, 8.72);
  const leftReach = readingReach;
  const latchReach = Math.max(openingReach, closingReach);
  const rightReach = Math.max(latchReach, window(time, 1.5, 1.98, 6.3, 6.65));
  return {
    door,
    letter: extracted,
    peek: window(time, 1.5, 1.9, 2.4, 2.8),
    reach: Math.max(leftReach, rightReach),
    reading,
    letterPosition,
    letterRotation,
    leftHand: letterGrip(letterPosition, letterRotation, -1),
    rightHand:
      latchReach > 0
        ? doorGrip(door)
        : letterGrip(letterPosition, letterRotation, 1),
    leftReach,
    rightReach,
  };
}

export const CLOSED_MAIL: MailCheckState = sampleMailCheck(0);
