import { z } from "zod";

export const S_Session = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
  }),
});

export type I_Session = z.infer<typeof S_Session>;
