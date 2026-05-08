// =============================================================================
// AddressManager — React island for managing shipping addresses
// Supports: list, add, edit, delete, city autocomplete (RajaOngkir)
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Address {
	city: string;
	cityId: string | null;
	country: string;
	id: string;
	isDefault: boolean;
	label: string;
	phone: string;
	postalCode: string;
	province: string;
	recipientName: string;
	street: string;
}

interface City {
	id: string;
	name: string;
	postalCode: string;
	province: string;
	type: string;
}

interface FormState {
	city: string;
	cityId: string;
	isDefault: boolean;
	label: string;
	phone: string;
	postalCode: string;
	province: string;
	recipientName: string;
	street: string;
}

interface Props {
	initialAddresses: Address[];
	token: string;
}

const EMPTY_FORM: FormState = {
	label: "",
	recipientName: "",
	phone: "",
	street: "",
	city: "",
	province: "",
	postalCode: "",
	cityId: "",
	isDefault: false,
};

// ── City search autocomplete ──────────────────────────────────────────────────

function CitySearch({
	value,
	onChange,
	onSelect,
}: {
	value: string;
	onChange: (val: string) => void;
	onSelect: (city: City) => void;
}) {
	const [query, setQuery] = useState(value);
	const [results, setResults] = useState<City[]>([]);
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// close on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const search = useCallback(async (q: string) => {
		if (q.length < 2) {
			setResults([]);
			setOpen(false);
			return;
		}
		setLoading(true);
		try {
			const res = await api.get<{ success: true; data: City[] }>(
				"/shipping/cities",
				{ params: { q } },
			);
			setResults(res.data.slice(0, 8));
			setOpen(true);
		} catch {
			setResults([]);
		} finally {
			setLoading(false);
		}
	}, []);

	function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
		const q = e.target.value;
		setQuery(q);
		onChange(q);
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}
		timerRef.current = setTimeout(() => void search(q), 320);
	}

	function handleSelect(city: City) {
		const displayName = `${city.type} ${city.name}`;
		setQuery(displayName);
		onChange(displayName);
		onSelect(city);
		setOpen(false);
		setResults([]);
	}

	return (
		<div className="relative" ref={containerRef}>
			<div className="relative">
				<input
					className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-8 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
					onChange={handleInput}
					onFocus={() => results.length > 0 && setOpen(true)}
					placeholder="Cari kota atau kabupaten…"
					type="text"
					value={query}
				/>
				{loading && (
					<svg
						className="absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
							fill="currentColor"
						/>
					</svg>
				)}
			</div>
			{open && results.length > 0 && (
				<ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
					{results.map((city) => (
						<li key={city.id}>
							<button
								className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-50"
								onMouseDown={() => handleSelect(city)}
								type="button"
							>
								<span className="font-medium text-gray-900">
									{city.type} {city.name}
								</span>
								<span className="shrink-0 text-xs text-gray-400">
									{city.province} · {city.postalCode}
								</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

// ── Address form ──────────────────────────────────────────────────────────────

function AddressForm({
	initial,
	onSubmit,
	onCancel,
	loading,
	error,
}: {
	initial: FormState;
	onSubmit: (data: FormState) => void;
	onCancel: () => void;
	loading: boolean;
	error: string | null;
}) {
	const [form, setForm] = useState<FormState>(initial);

	function set(key: keyof FormState, value: string | boolean) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	function handleCitySelect(city: City) {
		setForm((prev) => ({
			...prev,
			cityId: city.id,
			city: `${city.type} ${city.name}`,
			province: city.province,
			postalCode: city.postalCode,
		}));
	}

	return (
		<form
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit(form);
			}}
		>
			{error && (
				<div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
					{error}
				</div>
			)}

			{/* Row: label + recipientName */}
			<div className="grid grid-cols-2 gap-3">
				<div>
					<label className="mb-1 block text-xs font-medium text-gray-600">
						Label <span className="text-red-500">*</span>
					</label>
					<input
						className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
						maxLength={50}
						onChange={(e) => set("label", e.target.value)}
						placeholder="cth: Rumah, Kantor"
						required
						type="text"
						value={form.label}
					/>
				</div>
				<div>
					<label className="mb-1 block text-xs font-medium text-gray-600">
						Nama Penerima <span className="text-red-500">*</span>
					</label>
					<input
						className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
						maxLength={100}
						onChange={(e) => set("recipientName", e.target.value)}
						placeholder="Nama lengkap"
						required
						type="text"
						value={form.recipientName}
					/>
				</div>
			</div>

			{/* Phone */}
			<div>
				<label className="mb-1 block text-xs font-medium text-gray-600">
					No. HP <span className="text-red-500">*</span>
				</label>
				<input
					className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
					onChange={(e) => set("phone", e.target.value)}
					placeholder="0812xxxxxxxx"
					required
					type="tel"
					value={form.phone}
				/>
			</div>

			{/* Street */}
			<div>
				<label className="mb-1 block text-xs font-medium text-gray-600">
					Alamat Lengkap <span className="text-red-500">*</span>
				</label>
				<textarea
					className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
					onChange={(e) => set("street", e.target.value)}
					placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
					required
					rows={3}
					value={form.street}
				/>
			</div>

			{/* City search */}
			<div>
				<label className="mb-1 block text-xs font-medium text-gray-600">
					Kota / Kabupaten <span className="text-red-500">*</span>
				</label>
				<CitySearch
					onChange={(val) => set("city", val)}
					onSelect={handleCitySelect}
					value={form.city}
				/>
				{form.cityId && (
					<p className="mt-1 text-xs text-gray-400">
						ID Kota: {form.cityId} · {form.province} · {form.postalCode}
					</p>
				)}
			</div>

			{/* Province + Postal Code (auto-filled, still editable) */}
			<div className="grid grid-cols-2 gap-3">
				<div>
					<label className="mb-1 block text-xs font-medium text-gray-600">
						Provinsi <span className="text-red-500">*</span>
					</label>
					<input
						className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
						onChange={(e) => set("province", e.target.value)}
						placeholder="Auto-isi dari kota"
						required
						type="text"
						value={form.province}
					/>
				</div>
				<div>
					<label className="mb-1 block text-xs font-medium text-gray-600">
						Kode Pos <span className="text-red-500">*</span>
					</label>
					<input
						className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
						maxLength={5}
						onChange={(e) => set("postalCode", e.target.value)}
						pattern="\d{5}"
						placeholder="5 digit"
						required
						type="text"
						value={form.postalCode}
					/>
				</div>
			</div>

			{/* Default checkbox */}
			<label className="flex cursor-pointer items-center gap-2 text-sm">
				<input
					checked={form.isDefault}
					className="h-4 w-4 rounded border-gray-300 accent-gray-900"
					onChange={(e) => set("isDefault", e.target.checked)}
					type="checkbox"
				/>
				<span className="text-gray-700">Jadikan alamat utama</span>
			</label>

			{/* Actions */}
			<div className="flex gap-2 pt-2">
				<button
					className="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
					disabled={loading}
					type="submit"
				>
					{loading ? "Menyimpan…" : "Simpan Alamat"}
				</button>
				<button
					className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
					disabled={loading}
					onClick={onCancel}
					type="button"
				>
					Batal
				</button>
			</div>
		</form>
	);
}

// ── Address card ──────────────────────────────────────────────────────────────

function AddressCard({
	address,
	onEdit,
	onDelete,
	deleting,
}: {
	address: Address;
	onEdit: () => void;
	onDelete: () => void;
	deleting: boolean;
}) {
	return (
		<div
			className={`relative rounded-xl border p-4 transition-colors ${address.isDefault ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white"}`}
		>
			{address.isDefault && (
				<span className="absolute top-3 right-3 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
					Utama
				</span>
			)}
			<p className="mb-1 text-sm font-semibold text-gray-900">
				{address.label} — {address.recipientName}
			</p>
			<p className="text-sm text-gray-500">{address.phone}</p>
			<p className="mt-1 text-sm leading-snug text-gray-600">
				{address.street}, {address.city}, {address.province}{" "}
				{address.postalCode}
			</p>
			{!address.cityId && (
				<p className="mt-1.5 text-xs text-amber-600">
					⚠ ID kota belum diset — ongkir tidak bisa dihitung saat checkout
				</p>
			)}
			<div className="mt-3 flex gap-2">
				<button
					className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
					onClick={onEdit}
				>
					Edit
				</button>
				<button
					className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
					disabled={deleting}
					onClick={onDelete}
				>
					{deleting ? "Menghapus…" : "Hapus"}
				</button>
			</div>
		</div>
	);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AddressManager({ initialAddresses, token }: Props) {
	const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
	const [mode, setMode] = useState<"list" | "add" | "edit">("list");
	const [editTarget, setEditTarget] = useState<Address | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [toast, setToast] = useState<string | null>(null);

	function showToast(msg: string) {
		setToast(msg);
		setTimeout(() => setToast(null), 3000);
	}

	// ── Create ──────────────────────────────────────────────────────────────────

	async function handleCreate(data: FormState) {
		setSubmitting(true);
		setFormError(null);
		try {
			const res = await api.post<{ success: true; data: Address }>(
				"/users/me/addresses",
				{
					label: data.label,
					recipientName: data.recipientName,
					phone: data.phone,
					street: data.street,
					city: data.city,
					province: data.province,
					postalCode: data.postalCode,
					cityId: data.cityId || undefined,
					isDefault: data.isDefault,
				},
				{ token },
			);
			// If new address is default, clear default flag on others
			setAddresses((prev) => {
				const updated = data.isDefault
					? prev.map((a) => ({ ...a, isDefault: false }))
					: prev;
				return [res.data, ...updated];
			});
			setMode("list");
			showToast("Alamat berhasil ditambahkan");
		} catch (err) {
			setFormError(
				err instanceof Error ? err.message : "Gagal menambah alamat",
			);
		} finally {
			setSubmitting(false);
		}
	}

	// ── Update ──────────────────────────────────────────────────────────────────

	async function handleUpdate(data: FormState) {
		if (!editTarget) {
			return;
		}
		setSubmitting(true);
		setFormError(null);
		try {
			const res = await api.patch<{ success: true; data: Address }>(
				`/users/me/addresses/${editTarget.id}`,
				{
					label: data.label,
					recipientName: data.recipientName,
					phone: data.phone,
					street: data.street,
					city: data.city,
					province: data.province,
					postalCode: data.postalCode,
					cityId: data.cityId || undefined,
					isDefault: data.isDefault,
				},
				{ token },
			);
			setAddresses((prev) => {
				const updated = data.isDefault
					? prev.map((a) => ({
							...a,
							isDefault: a.id === editTarget.id ? false : false,
						}))
					: prev;
				return updated.map((a) => (a.id === editTarget.id ? res.data : a));
			});
			setMode("list");
			setEditTarget(null);
			showToast("Alamat berhasil diperbarui");
		} catch (err) {
			setFormError(
				err instanceof Error ? err.message : "Gagal memperbarui alamat",
			);
		} finally {
			setSubmitting(false);
		}
	}

	// ── Delete ──────────────────────────────────────────────────────────────────

	async function handleDelete(id: string) {
		if (!confirm("Hapus alamat ini?")) {
			return;
		}
		setDeletingId(id);
		try {
			await api.delete(`/users/me/addresses/${id}`, { token });
			setAddresses((prev) => prev.filter((a) => a.id !== id));
			showToast("Alamat berhasil dihapus");
		} catch (err) {
			alert(err instanceof Error ? err.message : "Gagal menghapus alamat");
		} finally {
			setDeletingId(null);
		}
	}

	// ── Helpers ─────────────────────────────────────────────────────────────────

	function startEdit(address: Address) {
		setEditTarget(address);
		setFormError(null);
		setMode("edit");
	}

	function startAdd() {
		setEditTarget(null);
		setFormError(null);
		setMode("add");
	}

	function cancelForm() {
		setMode("list");
		setEditTarget(null);
		setFormError(null);
	}

	function buildInitialForm(address: Address | null): FormState {
		if (!address) {
			return EMPTY_FORM;
		}
		return {
			label: address.label,
			recipientName: address.recipientName,
			phone: address.phone,
			street: address.street,
			city: address.city,
			province: address.province,
			postalCode: address.postalCode,
			cityId: address.cityId ?? "",
			isDefault: address.isDefault,
		};
	}

	// ── Render ──────────────────────────────────────────────────────────────────

	return (
		<div className="space-y-4">
			{/* Toast */}
			{toast && (
				<div className="animate-fade-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
					✓ {toast}
				</div>
			)}

			{/* ── List view ── */}
			{mode === "list" && (
				<>
					{addresses.length === 0 ? (
						<div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
							<p className="text-sm font-medium text-gray-500">
								Belum ada alamat tersimpan
							</p>
							<p className="mt-1 text-xs text-gray-400">
								Tambah alamat untuk mempermudah checkout
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{addresses.map((address) => (
								<AddressCard
									address={address}
									deleting={deletingId === address.id}
									key={address.id}
									onDelete={() => void handleDelete(address.id)}
									onEdit={() => startEdit(address)}
								/>
							))}
						</div>
					)}

					<button
						className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
						onClick={startAdd}
					>
						<svg
							className="h-4 w-4"
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
							viewBox="0 0 24 24"
						>
							<path
								d="M12 5v14m7-7H5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						Tambah Alamat Baru
					</button>
				</>
			)}

			{/* ── Add form ── */}
			{mode === "add" && (
				<div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
					<h2 className="mb-4 text-base font-semibold text-gray-900">
						Tambah Alamat Baru
					</h2>
					<AddressForm
						error={formError}
						initial={EMPTY_FORM}
						loading={submitting}
						onCancel={cancelForm}
						onSubmit={(data) => void handleCreate(data)}
					/>
				</div>
			)}

			{/* ── Edit form ── */}
			{mode === "edit" && editTarget && (
				<div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
					<h2 className="mb-4 text-base font-semibold text-gray-900">
						Edit Alamat
					</h2>
					<AddressForm
						error={formError}
						initial={buildInitialForm(editTarget)}
						loading={submitting}
						onCancel={cancelForm}
						onSubmit={(data) => void handleUpdate(data)}
					/>
				</div>
			)}

			{/* Link back to checkout */}
			{mode === "list" && addresses.length > 0 && (
				<div className="pt-2 text-center">
					<a
						className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 hover:underline"
						href="/checkout"
					>
						Lanjut ke Checkout →
					</a>
				</div>
			)}
		</div>
	);
}
