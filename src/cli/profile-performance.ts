import {
  heldFlipperPerformanceWorkloads,
  profilePhysics,
} from '../playtest/performance-profile';
console.log(
  JSON.stringify(
    {
      ...profilePhysics(),
      heldFlippers: profilePhysics(200, heldFlipperPerformanceWorkloads),
    },
    null,
    2,
  ),
);
