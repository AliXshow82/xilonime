export async function onRequest(context) {
  const country = context.request.cf?.country || "XX";

  if (country === "IR") {
    return Response.redirect(
      "https://xilonime.ir",
      "https://www.xilonime.ir",
      302
    );
  }

  return context.next();
}
