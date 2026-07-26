import { useState } from "react"
import { ClipboardList } from "lucide-react"
import { cn } from "../../lib/cn"
import { TEXT } from "../../tokens"
import { CardShell } from "./CardShell"
import type { CardAction, FormField } from "../parsed"

function initialValues(fields: FormField[]): Record<string, string | number | boolean> {
	const out: Record<string, string | number | boolean> = {}
	for (const f of fields) {
		if (f.value !== undefined) out[f.name] = f.value
		else if (f.type === "toggle") out[f.name] = false
		else if (f.type === "number") out[f.name] = ""
		else if (f.type === "select") out[f.name] = f.options?.[0]?.value ?? ""
		else out[f.name] = ""
	}
	return out
}

/**
 * Inline structured form the assistant asks the user to fill. On submit it emits
 * submit-form; AiPage feeds the values back into the conversation as the next
 * user turn. Validates required fields locally before submitting.
 */
export function FormFillCard({
	title,
	submitLabel,
	fields,
	onAction,
}: {
	title?: string
	submitLabel?: string
	fields: FormField[]
	onAction?: (a: CardAction) => void
}) {
	const [values, setValues] = useState(() => initialValues(fields))
	const [submitted, setSubmitted] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const set = (name: string, v: string | number | boolean) => setValues((p) => ({ ...p, [name]: v }))

	const submit = () => {
		const missing = fields.find((f) => f.required && (values[f.name] === "" || values[f.name] === undefined))
		if (missing) {
			setError(missing.label + " is required")
			return
		}
		setError(null)
		setSubmitted(true)
		onAction?.({ kind: "submit-form", values })
	}

	const inputCls =
		"w-full rounded-lg bg-zinc-950/60 px-2.5 py-1.5 text-[13px] text-zinc-100 ring-1 ring-zinc-800/60 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"

	return (
		<CardShell accent="violet" icon={<ClipboardList size={14} />} title={title || "Fill in details"}>
			<div className="space-y-2.5">
				{fields.map((f) => (
					<label key={f.name} className="block">
						<span className={cn("mb-1 block text-[11px] font-medium", TEXT.secondary)}>
							{f.label}
							{f.required ? <span className="text-red-400"> *</span> : null}
						</span>
						{f.type === "toggle" ? (
							<button
								type="button"
								role="switch"
								aria-checked={Boolean(values[f.name])}
								disabled={submitted}
								onClick={() => set(f.name, !values[f.name])}
								className={cn(
									"relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
									values[f.name] ? "bg-violet-500" : "bg-zinc-700",
								)}
							>
								<span
									className={cn(
										"inline-block h-4 w-4 rounded-full bg-white transition-transform",
										values[f.name] ? "translate-x-4" : "translate-x-0.5",
									)}
								/>
							</button>
						) : f.type === "select" ? (
							<select
								disabled={submitted}
								value={String(values[f.name] ?? "")}
								onChange={(e) => set(f.name, e.target.value)}
								className={inputCls}
							>
								{(f.options || []).map((o) => (
									<option key={o.value} value={o.value}>
										{o.label}
									</option>
								))}
							</select>
						) : (
							<input
								type={f.type === "number" ? "number" : "text"}
								disabled={submitted}
								value={String(values[f.name] ?? "")}
								placeholder={f.placeholder}
								onChange={(e) => set(f.name, f.type === "number" ? Number(e.target.value) : e.target.value)}
								className={inputCls}
							/>
						)}
					</label>
				))}
				{error ? <p className="text-[11px] text-red-400">{error}</p> : null}
				<button
					type="button"
					disabled={submitted}
					onClick={submit}
					className={cn(
						"w-full rounded-lg px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60",
						submitted ? "bg-emerald-500/15 text-emerald-300" : "bg-violet-500 text-white hover:bg-violet-400",
					)}
				>
					{submitted ? "Submitted" : submitLabel || "Submit"}
				</button>
			</div>
		</CardShell>
	)
}
