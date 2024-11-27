import { Transform } from 'class-transformer';

export const NumberTransform = () =>
  Transform(({ value }) => {
    console.log({ value: Number(value) });

    return Number(value);
  });
