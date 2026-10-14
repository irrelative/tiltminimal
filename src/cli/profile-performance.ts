import {
  heldFlipperPerformanceWorkloads,
  profilePhysics,
  profileRecording,
} from '../playtest/performance-profile';
console.log(
  JSON.stringify(
    {
      ...profilePhysics(),
      recording: profileRecording(),
      heldFlippers: profilePhysics(200, heldFlipperPerformanceWorkloads),
    },
    null,
    2,
  ),
);
