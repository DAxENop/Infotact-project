export default function LedgerTable({ transactions }) {

return(

<table className="ledger-table">

<thead>

<tr>

<th>Transaction ID</th>

<th>Tenant</th>

<th>Amount</th>

<th>Status</th>

<th>Date</th>

</tr>

</thead>

<tbody>

{transactions.length===0 ? (

<tr>

<td colSpan="5">

No Transactions Found

</td>

</tr>

):(

transactions.map((item)=>(

<tr key={item.id}>

<td>{item.id}</td>

<td>{item.tenant}</td>

<td>₹{item.amount}</td>

<td>

<span
className={`status ${item.status.toLowerCase()}`}
>

{item.status}

</span>

</td>

<td>{item.date}</td>

</tr>

))

)}

</tbody>

</table>

);

}