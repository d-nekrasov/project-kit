import { IsString, MinLength } from "class-validator";
import { Match } from "../validators/match.validator";

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(8)
  @Match<ResetPasswordDto>("password", {
    message: "Password confirmation does not match",
  })
  passwordConfirmation!: string;
}
