/** Export only data explicitly requested by the user; never reads unrelated browser storage. */
export function downloadText(name:string,text:string,type='application/json'):void {
 const url=URL.createObjectURL(new Blob([text],{type}));const link=document.createElement('a');
 link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
