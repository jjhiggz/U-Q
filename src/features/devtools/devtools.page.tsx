import { getRouteApi } from "@tanstack/react-router";
import { C__Devtools } from "./components/C__Devtools";

const route = getRouteApi("/devtools");

export function C_Page__Devtools() {
	const status = route.useLoaderData();
	return <C__Devtools message={status.message} />;
}
