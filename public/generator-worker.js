import {generate} from './engine.js';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,puzzle:generate(data.seed,data.rows,data.cols,data.lockCount??null)});}catch(e){self.postMessage({id:data.id,error:e.message});}};
