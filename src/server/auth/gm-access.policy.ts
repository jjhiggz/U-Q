const GM_EMAIL = "jonathan.higger@gmail.com";

export function F_Policy__IsGM({ email }: { readonly email: string }): boolean {
	return email.toLowerCase() === GM_EMAIL;
}
