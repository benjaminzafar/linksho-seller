export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret',
  });
  setResponseStatus(event, 204);
  return '';
});
