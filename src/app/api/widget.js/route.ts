import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Serves the embeddable widget loader. Any site adds:
//   <script src="https://management.morris.is/api/widget.js" async></script>
// which injects a floating chat bubble that opens the assistant in an iframe.
export function GET() {
  const origin = "https://management.morris.is";
  const js = `(function(){
  if (window.__mmWidgetLoaded) return; window.__mmWidgetLoaded = true;
  var ORIGIN = "${origin}";
  var open = false;
  var btn = document.createElement("button");
  btn.setAttribute("aria-label","Chat with our assistant");
  btn.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:2147483000;width:56px;height:56px;border-radius:50%;border:none;background:#1B3A2F;color:#F7F5EF;font-size:24px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25)";
  btn.innerHTML = "&#128172;";
  var frame = document.createElement("iframe");
  frame.src = ORIGIN + "/chat";
  frame.style.cssText = "position:fixed;bottom:88px;right:20px;z-index:2147483000;width:380px;height:560px;max-width:calc(100vw - 40px);max-height:calc(100vh - 120px);border:none;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.28);display:none;background:#F7F5EF";
  frame.setAttribute("title","Property Assistant");
  function toggle(){ open=!open; frame.style.display = open ? "block" : "none"; btn.innerHTML = open ? "&#10005;" : "&#128172;"; }
  btn.addEventListener("click", toggle);
  document.body.appendChild(frame);
  document.body.appendChild(btn);
})();`;
  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
