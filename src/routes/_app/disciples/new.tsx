import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Page } from '@/components/shell/page'
import {
  DiscipleForm,
  EMPTY_DISCIPLE,
} from '@/components/disciples/disciple-form'
import {
  createDisciple,
  getDisciplePrefill,
} from '@/server/disciples/disciples.functions'

export const Route = createFileRoute('/_app/disciples/new')({
  validateSearch: z.object({
    fromGuest: z.string().optional(),
    fromBeliever: z.string().optional(),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getDisciplePrefill({ data: deps }),
  head: () => ({ meta: [{ title: 'New disciple · GCC Admin' }] }),
  component: NewDisciplePage,
})

function NewDisciplePage() {
  const prefill = Route.useLoaderData()
  const navigate = useNavigate()
  const from =
    prefill?.kind === 'guest'
      ? 'From the guest list: their details are filled in.'
      : prefill?.kind === 'believer'
        ? 'From soul winning: their details are filled in.'
        : 'Add someone to your network.'
  return (
    <Page
      title="New disciple"
      description={from}
      back={{ to: '/disciples', label: 'Disciples' }}
      className="max-w-3xl"
    >
      <div className="border bg-card p-4 md:p-6 dark:border-transparent rounded-xl">
        <DiscipleForm
          initial={{
            ...EMPTY_DISCIPLE,
            ...(prefill
              ? {
                  name: prefill.name,
                  gender: prefill.gender,
                  memberType: prefill.memberType,
                  contactNo: prefill.contactNo ?? '',
                  address: prefill.address ?? '',
                }
              : {}),
          }}
          submitLabel="Add disciple"
          onCancel={() => void navigate({ to: '/disciples' })}
          onSubmit={async (values) => {
            const made = await createDisciple({
              data: {
                ...values,
                fromNewComerId:
                  prefill?.kind === 'guest' ? prefill.id : undefined,
                fromNewBelieverId:
                  prefill?.kind === 'believer' ? prefill.id : undefined,
              },
            })
            toast.success(`${values.name} added`)
            await navigate({
              to: '/disciples/$discipleId',
              params: { discipleId: made.id },
            })
          }}
        />
      </div>
    </Page>
  )
}
