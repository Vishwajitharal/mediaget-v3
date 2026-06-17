(async ()=>{
  try{
    const res = await fetch('http://localhost:3000/api/fetch',{ 
      method:'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    });
    const text = await res.text();
    console.log(text);
  }catch(e){console.error(e);
  }
})();
