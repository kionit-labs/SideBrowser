window.addEventListener(`load`,()=>{e()});function e(){let e=document.createElement(`style`);e.id=`slide-browser-custom-scrollbar`,e.innerHTML=`
    ::-webkit-scrollbar {
      width: 10px !important;
      height: 10px !important;
      background-color: transparent !important;
    }
    ::-webkit-scrollbar-track {
      background: transparent !important;
    }
    ::-webkit-scrollbar-thumb {
      background-color: rgba(120, 120, 120, 0.4) !important;
      border-radius: 10px !important;
      border: 2px solid transparent !important;
      background-clip: padding-box !important;
    }
    ::-webkit-scrollbar-thumb:hover {
      background-color: rgba(120, 120, 120, 0.7) !important;
    }
  `,document.head.appendChild(e)}