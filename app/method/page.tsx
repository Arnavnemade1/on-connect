const STEPS = ["Receive the message", "Identify the question and topic", "Separate general education from individual advice", "Load permitted profile settings", "Retrieve approved content", "Select a communication strategy", "Generate the response", "Check grounding and safety rules", "Present the explanation", "Record a structured adaptation event", "Offer comprehension feedback"];
const OPS = [["DEVELOPMENTAL_ADAPTATION", "Wording chosen for the selected age profile"], ["STEPWISE_EXPLANATION", "Procedure presented as numbered steps"], ["EXAMPLE_ADDED", "Familiar comparison added"], ["VOCABULARY_DEFINED", "Medical terms defined inline"], ["SHORT_FORMAT", "Brevity preference applied"], ["SIMPLIFIED_ON_REQUEST / EXPANDED_ON_REQUEST", "Level shifted after an explicit request"], ["SAFETY_INDIVIDUAL_ADVICE_REDIRECT", "Personal medical question redirected to the care team"], ["SAFETY_SUPPORT_REDIRECT", "Distress language routed to a trusted adult"]];
export default function Method() {
  return (<>
    <div className="eyebrow">Method</div><h1>How Onconnect adapts an explanation</h1>
    <div className="grid2" style={{ marginTop: 20 }}>
      <div className="card"><h2>Response pipeline</h2>{STEPS.map((s, i) => <div className="step" key={s}><b>{i + 1}</b><span>{s}</span></div>)}</div>
      <div><div className="card"><h2>Adaptation operations</h2><table><tbody>{OPS.map(([a, d]) => <tr key={a}><td><span className="tagl">{a}</span></td><td>{d}</td></tr>)}</tbody></table></div>
        <div className="card"><h2>Measures</h2><ul><li><b>Reading grade</b>: Flesch–Kincaid estimate of the reply text.</li><li><b>Key-concept coverage</b>: share of the topic&apos;s approved key concepts that appear in the reply. A heuristic, not a fact-check.</li><li><b>Audit log</b>: what was applied, with model and prompt version.</li></ul></div>
        <div className="card"><h2>Limitations</h2><ul><li>Content is draft and awaits clinician review.</li><li>Profiles are starting points, not psychological classifications.</li><li>Diagnoses are never verified; the system gives general education only.</li><li>Metrics are automated and have not been validated with children.</li></ul></div></div>
    </div></>);
}
