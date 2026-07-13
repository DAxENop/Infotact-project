import { useState } from "react";
import "../styles/modal.css";

export default function AddTransactionModal({
  show,
  onClose,
  onAdd,
}) {

  const [tenant, setTenant] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("Success");

  if (!show) return null;

  const handleSubmit = () => {

    if (!tenant || !amount) {
      alert("Please fill all fields");
      return;
    }

    const newTransaction = {

      id: "TXN" + Math.floor(Math.random() * 10000),

      tenant,

      amount: Number(amount),

      status,

      date: new Date().toLocaleDateString(),

    };

    onAdd(newTransaction);

    setTenant("");
    setAmount("");
    setStatus("Success");

    onClose();

  };

  return (

<div className="modal-overlay">

<div className="modal">

<h2>Add Transaction</h2>

<input
type="text"
placeholder="Tenant Name"
value={tenant}
onChange={(e)=>setTenant(e.target.value)}
/>

<input
type="number"
placeholder="Amount"
value={amount}
onChange={(e)=>setAmount(e.target.value)}
/>

<select
value={status}
onChange={(e)=>setStatus(e.target.value)}
>

<option>Success</option>
<option>Failed</option>
<option>Pending</option>

</select>

<div className="buttons">

<button onClick={handleSubmit}>
Save
</button>

<button onClick={onClose}>
Cancel
</button>

</div>

</div>

</div>

  );

}