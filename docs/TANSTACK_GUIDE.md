# TanStack Query + Form — Panduan Penggunaan di apps/web

Panduan ini adalah sumber kebenaran tunggal untuk semua konvensi data-fetching dan form di `apps/web`.

---

## DO — Wajib Diikuti

### ✅ Pakai reusable hooks dari `src/hooks/`

```ts
// ✅ Query
import { useProducts } from "@/hooks/queries/useProducts";
import { useCart }     from "@/hooks/queries/useCart";
import { useUser }     from "@/hooks/queries/useUser";

// ✅ Mutation
import { useAddToCart }       from "@/hooks/mutations/useAddToCart";
import { useUpdateCartQty }   from "@/hooks/mutations/useUpdateCartQty";
import { useRemoveFromCart }  from "@/hooks/mutations/useRemoveFromCart";
import { useUpdateUser }      from "@/hooks/mutations/useUpdateUser";
```

### ✅ Pakai `queryKeys` factory — jangan hardcode key

```ts
// ✅ Benar
import { queryKeys } from "@/lib/query-keys";

useQuery({ queryKey: queryKeys.products.list({ page: 1 }) });
qc.invalidateQueries({ queryKey: queryKeys.cart() });

// ❌ Salah — hardcoded string/array
useQuery({ queryKey: ["cart"] });
useQuery({ queryKey: ["products", "list"] });
```

### ✅ Pakai `fetcher` / `fetcherPost` / `fetcherPatch` dari `@/lib/fetcher`

```ts
// ✅ Benar — type-safe, validasi Zod otomatis
import { fetcher, fetcherPost } from "@/lib/fetcher";
import { userSchema } from "@/hooks/queries/useUser";

const user = await fetcher("/users/me", userSchema);

// ❌ Salah — fetch langsung tanpa validasi
const res = await fetch("/api/proxy/users/me");
const data = await res.json();
```

### ✅ Selalu `initialData` dari Astro SSR untuk island above-the-fold

```astro
---
// ✅ Benar — fetch di frontmatter, pass sebagai initialData
const productsRes = await api.get("/products");
const initialProducts = { data: productsRes.data, meta: productsRes.meta, success: true };
---
<ProductGrid client:load initialProducts={initialProducts} />
```

### ✅ Optimistic update wajib untuk cart mutations

Semua cart mutations harus implement pola onMutate → onError → onSettled:

```ts
useMutation({
  mutationFn: async (vars) => { /* API call */ },
  onMutate: async (vars) => {
    await qc.cancelQueries({ queryKey: queryKeys.cart() });
    const prev = qc.getQueryData(queryKeys.cart());
    qc.setQueryData(queryKeys.cart(), /* optimistic update */);
    return { prev };
  },
  onError: (_, __, ctx) => {
    qc.setQueryData(queryKeys.cart(), ctx?.prev);
  },
  onSettled: () => {
    qc.invalidateQueries({ queryKey: queryKeys.cart() });
  },
});
```

### ✅ Setiap mutation yang ubah data harus invalidate queryKey

```ts
// ✅ Benar
onSuccess: () => {
  qc.invalidateQueries({ queryKey: queryKeys.user() });
}

// ❌ Salah — tidak ada invalidation → cache basi
onSuccess: () => {
  // nothing
}
```

### ✅ Pakai TanStack Form untuk semua form input

> ⚠️ `@tanstack/zod-form-adapter` hanya tersedia untuk react-form v0.x.
> Di react-form v1.x, gunakan `safeParse` langsung — tidak perlu adapter.

```tsx
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

const nameSchema = z.string().min(2, "Minimal 2 karakter");

const form = useForm({
  defaultValues: { name: "", email: "" },
  onSubmit: async ({ value }) => {
    const parsed = formSchema.safeParse(value);
    if (!parsed.success) return;
    await mutation.mutateAsync(parsed.data);
  },
});
```

### ✅ Validasi per field dengan safeParse

```tsx
<form.Field
  name="name"
  validators={{
    onChange: ({ value }) => {
      const r = nameSchema.safeParse(value);
      return r.success ? undefined : r.error.issues[0]?.message;
    },
  }}
>
  {field => (
    <div>
      <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} />
      {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
        <p className="text-xs text-red-600">{String(field.state.meta.errors[0])}</p>
      )}
    </div>
  )}
</form.Field>
```

> **Zod v4 API changes**: gunakan `z.email()` bukan `z.string().email()`, dan `z.url()` bukan `z.string().url()`.
> Akses errors via `issues` bukan `errors`: `r.error.issues[0]?.message`

### ✅ Pakai schema dari `@repo/common/schemas` — jangan buat ulang

```ts
// Schema yang tersedia
import {
  loginSchema, registerSchema, updateProfileSchema, changePasswordSchema,
  createAddressSchema, updateAddressSchema,
  createReviewSchema,
  createOrderSchema, validateVoucherSchema, cartItemSchema,
} from "@repo/common/schemas";
```

### ✅ Setiap island yang pakai TanStack Query harus wrap dengan QueryClientProvider

```tsx
// ✅ Benar — wrap dengan shared queryClient (module singleton → shared cache)
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient }         from "@/lib/query-client";

export default function MyIsland(props: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <MyIslandInner {...props} />
    </QueryClientProvider>
  );
}
```

> Kenapa per-island? Astro membuat React root terpisah untuk setiap island (`client:X`).
> Karena `queryClient` adalah module-level singleton, semua islands share cache yang sama.

---

## DON'T — Dilarang

### ❌ Jangan fetch langsung di komponen

```ts
// ❌ Salah
useEffect(() => {
  fetch("/api/proxy/products").then(r => r.json()).then(setProducts);
}, []);

// ✅ Benar
const { data: products } = useProducts({ params });
```

### ❌ Jangan hardcode query keys

```ts
// ❌ Salah
useQuery({ queryKey: ["cart"] });
queryClient.invalidateQueries({ queryKey: ["user", "me"] });

// ✅ Benar
useQuery({ queryKey: queryKeys.cart() });
queryClient.invalidateQueries({ queryKey: queryKeys.user() });
```

### ❌ Jangan skip validasi Zod pada response fetcher

```ts
// ❌ Salah — tidak ada validasi runtime
const data = await apiProxy.get<Product>("/products/123");

// ✅ Benar
const data = await fetcher("/products/123", productDetailSchema);
```

### ❌ Jangan buat schema Zod di dalam komponen

```ts
// ❌ Salah — schema di dalam komponen, re-created setiap render
function MyForm() {
  const schema = z.object({ name: z.string().min(2) }); // ← jangan ini
}

// ✅ Benar — import dari @repo/common/schemas atau definisikan di luar komponen
import { updateProfileSchema } from "@repo/common/schemas";
```

### ❌ Jangan pakai `useState + useEffect` untuk data server

```ts
// ❌ Salah
const [user, setUser] = useState(null);
useEffect(() => { apiProxy.get("/users/me").then(setUser); }, []);

// ✅ Benar
const { data: user } = useUser({ enabled: isLoggedIn });
```

### ❌ Jangan import `react-query` (tanpa @tanstack prefix)

```ts
// ❌ Salah — package lama
import { useQuery } from "react-query";

// ✅ Benar
import { useQuery } from "@tanstack/react-query";
```

---

## Query Key Conventions

Semua key ada di `apps/web/src/lib/query-keys.ts`:

| Data | Key | Invalidation Scope |
|------|-----|-------------------|
| Products list | `queryKeys.products.list(params)` | `queryKeys.products.all()` invalidates semua list |
| Product detail | `queryKeys.products.detail(slug)` | — |
| Related products | `queryKeys.products.related(slug)` | — |
| Cart | `queryKeys.cart()` | — |
| User profile | `queryKeys.user()` | — |
| Orders list | `queryKeys.orders.list(params)` | `queryKeys.orders.all()` invalidates semua list |
| Order detail | `queryKeys.orders.detail(id)` | — |
| Wishlist | `queryKeys.wishlist.all()` | — |
| Reviews | `queryKeys.reviews.forProduct(productId)` | `queryKeys.reviews.all()` |

---

## staleTime Default

| Data | staleTime | Alasan |
|------|-----------|--------|
| Products list/detail | 5 menit | Produk jarang berubah |
| Cart | 2 menit | Cart sering berubah |
| User profile | 10 menit | Profil sangat jarang berubah |
| Orders | 1 menit | Status order bisa berubah cepat |

---

## Form Pattern (TanStack Form v1)

### Pattern dasar

```tsx
import { useForm }       from "@tanstack/react-form";
import { zodValidator }  from "@tanstack/zod-form-adapter";

const form = useForm({
  defaultValues: { /* ... */ },
  validatorAdapter: zodValidator(),
  validators: {
    onChange: myZodSchema,           // validasi saat user mengetik
  },
  onSubmit: async ({ value }) => {
    await mutation.mutateAsync(value);
  },
});

return (
  <form onSubmit={e => { e.preventDefault(); void form.handleSubmit(); }}>
    <form.Field name="fieldName">
      {field => (
        <input
          value={field.state.value}
          onChange={e => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
        />
      )}
    </form.Field>

    <form.Subscribe selector={s => ({ canSubmit: s.canSubmit, isDirty: s.isDirty })}>
      {({ canSubmit, isDirty }) => (
        <button type="submit" disabled={!canSubmit || !isDirty}>
          Simpan
        </button>
      )}
    </form.Subscribe>
  </form>
);
```

---

## Menambah Hook Baru

1. Tambahkan query key di `src/lib/query-keys.ts`
2. Buat file di `src/hooks/queries/` atau `src/hooks/mutations/`
3. Export return type: `export type UseXxxReturn = ReturnType<typeof useXxx>`
4. Tambahkan entry di `TANSTACK_MIGRATION_TODO.md`

---

*Lihat juga: [ADR-002](ADR-002-react-vs-solid-islands.md) · [TanStack Migration TODO](../TANSTACK_MIGRATION_TODO.md)*
