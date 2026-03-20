import { TextToken } from "../../d";

let tokenIdSeed = 0;

type TokenInput = Omit<TextToken, "temp_id">;

export const createToken = <T extends TokenInput>(token: T): T & Pick<TextToken, "temp_id"> => {
  return {
    ...token,
    temp_id: `rt-${tokenIdSeed++}`,
  };
};
