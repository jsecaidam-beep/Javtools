import express from 'express';
export function createApiApp() {
 const app=express();
 app.get('/api/health', (_req,res)=>res.json({status:'ok',aiEnabled:false}));
 return app;
}

export default createApiApp();
