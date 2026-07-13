import { useEffect } from "react";

export default function Toast({
  message,
  show,
  onClose,
}) {

  useEffect(() => {

    if (show) {

      const timer = setTimeout(() => {

        onClose();

      },3000);

      return ()=>clearTimeout(timer);

    }

  },[show]);

  if(!show) return null;

  return(

<div className="toast">

{message}

</div>

  );

}