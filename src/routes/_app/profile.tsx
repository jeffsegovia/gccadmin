import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Page } from '@/components/shell/page'
import { FormField } from '@/components/form-field'
import { SubmitButton } from '@/components/submit-button'
import { ThemeSegmented } from '@/components/shell/theme-segmented'
import { Input } from '@/components/ui/input'
import { messageOf } from '@/lib/errors'
import { getProfile, updateProfile } from '@/server/profile/profile.functions'

export const Route = createFileRoute('/_app/profile')({
  loader: () => getProfile(),
  head: () => ({ meta: [{ title: 'My profile · GCC Admin' }] }),
  component: ProfilePage,
})

function ProfilePage() {
  const profile = Route.useLoaderData()
  const { viewer } = Route.useRouteContext()
  const router = useRouter()
  const [values, setValues] = useState({
    name: profile?.name ?? '',
    birthdate: profile?.birthdate ?? '',
    address: profile?.address ?? '',
    contactNo: profile?.contactNo ?? '',
  })
  const [pending, setPending] = useState(false)
  return (
    <Page title="My profile" description={viewer.email} className="max-w-2xl">
      {profile ? (
        <form
          className="flex flex-col gap-4 border bg-card p-4 md:p-6 dark:border-transparent rounded-xl"
          onSubmit={async (e) => {
            e.preventDefault()
            setPending(true)
            try {
              await updateProfile({ data: values })
              toast.success('Profile saved')
              await router.invalidate()
            } catch (error) {
              toast.error(messageOf(error))
            } finally {
              setPending(false)
            }
          }}
        >
          <FormField label="Name" htmlFor="p-name">
            <Input
              id="p-name"
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Birthdate" htmlFor="p-birth">
              <Input
                id="p-birth"
                type="date"
                value={values.birthdate}
                onChange={(e) =>
                  setValues({ ...values, birthdate: e.target.value })
                }
              />
            </FormField>
            <FormField
              label="Phone"
              htmlFor="p-phone"
              optional
              hint="Your disciples see it on their portal page."
            >
              <Input
                id="p-phone"
                type="tel"
                value={values.contactNo}
                onChange={(e) =>
                  setValues({ ...values, contactNo: e.target.value })
                }
              />
            </FormField>
          </div>
          <FormField label="Address" htmlFor="p-address">
            <Input
              id="p-address"
              value={values.address}
              onChange={(e) =>
                setValues({ ...values, address: e.target.value })
              }
            />
          </FormField>
          <SubmitButton size="lg" pending={pending} className="sm:w-fit">
            Save
          </SubmitButton>
        </form>
      ) : (
        <p className="border bg-card p-4 text-sm text-muted-foreground dark:border-transparent rounded-xl">
          Your account isn’t linked to a leader record yet. An admin can link it
          from Leaders.
        </p>
      )}
      <section className="flex flex-col gap-2">
        <h2 className="px-0.5 text-[13px] font-medium text-muted-foreground">
          Appearance
        </h2>
        <ThemeSegmented />
      </section>
    </Page>
  )
}
