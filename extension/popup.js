document.querySelector('#open').onclick=async()=>{const r=await chrome.runtime.sendMessage({type:'open'});if(r.error)document.querySelector('#status').textContent=r.error;else window.close();};
