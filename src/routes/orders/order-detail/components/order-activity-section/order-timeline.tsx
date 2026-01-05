import { Button, Text, Tooltip, clx, toast, usePrompt } from "@medusajs/ui"
import { Collapsible as RadixCollapsible } from "radix-ui"

import { type PropsWithChildren, type ReactNode, useMemo, useState } from "react"

import type {
  HttpTypes,
} from "@medusajs/types"
import { useTranslation } from "react-i18next"
import type {
  ExtendedAdminOrder,
  ExtendedAdminOrderChange,
  ExtendedAdminOrderFulfillment,
  ExtendedAdminOrderLineItem,
} from "@custom-types/order"
import type { ExtendedAdminReturn } from "@custom-types/returns"
import type { ExtendedAdminClaim } from "@custom-types/claims"
import {
  useCancelOrderTransfer,
  useCustomer,
  useOrderChanges,
  useOrderLineItems,
} from "@hooks/api"
import { useCancelClaim, useClaims } from "@hooks/api/claims"
import {
  useCancelExchange,
  useExchanges,
} from "@hooks/api/exchanges"
import { useCancelReturn, useReturns } from "@hooks/api/returns"
import { useDate } from "@hooks/use-date"
import { getFormattedAddress } from "@lib/addresses"
import { getStylizedAmount } from "@lib/money-amount-helpers"
import { getPaymentsFromOrder } from "@lib/orders"
import ActivityItems from "./activity-items"
import ChangeDetailsTooltip from "./change-details-tooltip"
import type { ExtendedAdminExchange } from "@custom-types/exchanges"
import { By } from "@components/common/user-link"

type OrderTimelineProps = {
  order: ExtendedAdminOrder
}

/**
 * Order Changes that are not related to RMA flows
 */
const NON_RMA_CHANGE_TYPES = ["transfer", "update_order"]

export const OrderTimeline = ({ order }: OrderTimelineProps) => {
  const items = useActivityItems(order)

  if (items.length <= 3) {
    return (
      <div className="flex flex-col gap-y-0.5">
        {items.map((item, index) => {
          return (
            <OrderActivityItem
              key={index}
              title={item.title}
              timestamp={item.timestamp}
              isFirst={index === items.length - 1}
              itemsToSend={item.itemsToSend}
              itemsToReturn={item.itemsToReturn}
              itemsMap={item.itemsMap}
            >
              {item.children}
            </OrderActivityItem>
          )
        })}
      </div>
    )
  }

  const lastItems = items.slice(0, 2)
  const collapsibleItems = items.slice(2, items.length - 1)
  const firstItem = items[items.length - 1]

  return (
    <div className="flex flex-col gap-y-0.5">
      {lastItems.map((item, index) => {
        return (
          <OrderActivityItem
            key={index}
            title={item.title}
            timestamp={item.timestamp}
            itemsToSend={item.itemsToSend}
            itemsToReturn={item.itemsToReturn}
            itemsMap={item.itemsMap}
          >
            {item.children}
          </OrderActivityItem>
        )
      })}
      <OrderActivityCollapsible activities={collapsibleItems} />
      <OrderActivityItem
        title={firstItem.title}
        timestamp={firstItem.timestamp}
        isFirst
        itemsToSend={firstItem.itemsToSend}
        itemsToReturn={firstItem.itemsToReturn}
        itemsMap={firstItem.itemsMap}
      >
        {firstItem.children}
      </OrderActivityItem>
    </div>
  )
}

type Activity = {
  title: string | ReactNode
  timestamp: string | Date | null
  children?: ReactNode
  itemsToSend?:
    | ExtendedAdminClaim["additional_items"]
    | ExtendedAdminExchange["additional_items"]
  itemsToReturn?: ExtendedAdminReturn["items"]
  itemsMap?: Map<string, ExtendedAdminOrderLineItem>
}

const useActivityItems = (order: ExtendedAdminOrder): Activity[] => {
  const { t } = useTranslation()

  const { order_changes: orderChanges = [] } = useOrderChanges(order.id, {
    change_type: [
      "edit",
      "claim",
      "exchange",
      "return",
      "transfer",
      "update_order",
    ],
  })

  const rmaChanges = orderChanges.filter(
    (oc) => oc.change_type && !NON_RMA_CHANGE_TYPES.includes(oc.change_type)
  )

  const missingLineItemIds = getMissingLineItemIds(order, rmaChanges)
  const { order_items: removedLineItems = [] } = useOrderLineItems(
    order.id,

    {
      fields: "+quantity",
      item_id: missingLineItemIds,
    },
    {
      enabled: !!rmaChanges.length,
    }
  )

  const itemsMap = useMemo(() => {
    const _itemsMap = new Map<string, ExtendedAdminOrderLineItem>(
      (order?.items || []).map((i) => [i.id, i as ExtendedAdminOrderLineItem])
    )

    for (const id of missingLineItemIds) {
      const i = removedLineItems.find((item) => item.item.id === id)

      if (i) {
        const quantity = (i as { quantity?: number }).quantity
        if (quantity !== undefined) {
          _itemsMap.set(id, { ...i.item, quantity } as ExtendedAdminOrderLineItem) // copy quantity from OrderItem to OrderLineItem
        }
      }
    }

    return _itemsMap
  }, [order.items, removedLineItems, missingLineItemIds])

  const { returns = [] } = useReturns({
    order_id: order.id,
    fields: "+received_at,*items",
  })

  const { claims = [] } = useClaims({
    order_id: order.id,
    fields: "*additional_items",
  })

  const { exchanges = [] } = useExchanges({
    order_id: order.id,
    fields: "*additional_items",
  })
  
  const payments = getPaymentsFromOrder(order)

  const notes: { created_at: string; value: string; author_id: string }[] = []
  const isLoading = false
  // const { notes, isLoading, isError, error } = useNotes(
  //   {
  //     resource_id: order.id,
  //     limit: NOTE_LIMIT,
  //     offset: 0,
  //   },
  //   {
  //     keepPreviousData: true,
  //   }
  // )
  //
  // if (isError) {
  //   throw error
  // }

  return useMemo(() => {
    if (isLoading) {
      return []
    }

    const items: Activity[] = []

    for (const payment of payments) {
      const amount = payment.amount as number

      items.push({
        title: t("orders.activity.events.payment.awaiting"),
        timestamp: payment.created_at!,
        children: (
          <Text size="small" className="text-ui-fg-subtle">
            {getStylizedAmount(amount, payment.currency_code)}
          </Text>
        ),
      })

      if (payment.canceled_at) {
        items.push({
          title: t("orders.activity.events.payment.canceled"),
          timestamp: payment.canceled_at,
          children: (
            <Text size="small" className="text-ui-fg-subtle">
              {getStylizedAmount(amount, payment.currency_code)}
            </Text>
          ),
        })
      }

      if (payment.captured_at) {
        items.push({
          title: t("orders.activity.events.payment.captured"),
          timestamp: payment.captured_at,
          children: (
            <Text size="small" className="text-ui-fg-subtle">
              {getStylizedAmount(amount, payment.currency_code)}
            </Text>
          ),
        })
      }

      for (const refund of payment.refunds || []) {
        items.push({
          title: t("orders.activity.events.payment.refunded"),
          timestamp: refund.created_at,
          children: (
            <Text size="small" className="text-ui-fg-subtle">
              {getStylizedAmount(
                refund.amount as number,
                payment.currency_code
              )}
            </Text>
          ),
        })
      }
    }

    for (const fulfillment of order.fulfillments || []) {
      items.push({
        title: t("orders.activity.events.fulfillment.created"),
        timestamp: fulfillment.created_at,
        children: <FulfillmentCreatedBody fulfillment={fulfillment} />,
      })

      if (fulfillment.delivered_at) {
        items.push({
          title: t("orders.activity.events.fulfillment.delivered"),
          timestamp: fulfillment.delivered_at,
          children: <FulfillmentCreatedBody fulfillment={fulfillment} />,
        })
      }

      if (fulfillment.shipped_at) {
        items.push({
          title: t("orders.activity.events.fulfillment.shipped"),
          timestamp: fulfillment.shipped_at,
          children: (
            <FulfillmentCreatedBody fulfillment={fulfillment} />
          ),
        })
      }

      if (fulfillment.canceled_at) {
        items.push({
          title: t("orders.activity.events.fulfillment.canceled"),
          timestamp: fulfillment.canceled_at,
        })
      }
    }

    const returnMap = new Map<string, ExtendedAdminReturn>()

    for (const ret of returns) {
      returnMap.set(ret.id, ret)

      if (ret.claim_id || ret.exchange_id) {
        continue
      }

      // Always display created action
      items.push({
        title: t("orders.activity.events.return.created", {
          returnId: ret.id.slice(-7),
        }),
        timestamp: ret.created_at,
        itemsToReturn: ret?.items,
        itemsMap,
        children: <ReturnBody orderReturn={ret} isCreated={!ret.canceled_at} />,
      })

      if (ret.canceled_at) {
        items.push({
          title: t("orders.activity.events.return.canceled", {
            returnId: ret.id.slice(-7),
          }),
          timestamp: ret.canceled_at,
        })
      }

      if (ret.status === "received" || ret.status === "partially_received") {
        items.push({
          title: t("orders.activity.events.return.received", {
            returnId: ret.id.slice(-7),
          }),
          timestamp: ret.received_at,
          itemsToReturn: ret?.items,
          itemsMap,
          children: <ReturnBody orderReturn={ret} isCreated={!ret.canceled_at} isReceived />,
        })
      }
    }

    for (const claim of claims) {
      const claimReturn = returnMap.get(claim.return_id!)

      items.push({
        title: t(
          claim.canceled_at
            ? "orders.activity.events.claim.canceled"
            : "orders.activity.events.claim.created",
          {
            claimId: claim.id.slice(-7),
          }
        ),
        timestamp: claim.canceled_at || claim.created_at,
        itemsToSend: claim.additional_items,
        itemsToReturn: claimReturn?.items,
        itemsMap,
        children: <ClaimBody claim={claim} claimReturn={claimReturn} />,
      })
    }

    for (const exchange of exchanges) {
      const exchangeReturn = returnMap.get(exchange.return_id!)

      items.push({
        title: t(
          exchange.canceled_at
            ? "orders.activity.events.exchange.canceled"
            : "orders.activity.events.exchange.created",
          {
            exchangeId: exchange.id.slice(-7),
          }
        ),
        timestamp: exchange.canceled_at || exchange.created_at,
        itemsToSend: exchange.additional_items,
        itemsToReturn: exchangeReturn?.items,
        itemsMap,
        children: (
          <ExchangeBody exchange={exchange} exchangeReturn={exchangeReturn} />
        ),
      })
    }

    for (const edit of orderChanges.filter((oc) => oc.change_type === "edit")) {
      const isConfirmed = edit.status === "confirmed"
      const isPending = edit.status === "pending"

      if (isPending) {
        continue
      }

      const editId = edit.id.slice(-7)
      
      let editTitle: string
      if (edit.status === "requested") {
        editTitle = t("orders.activity.events.edit.requested", { editId })
      } else if (edit.status === "confirmed") {
        editTitle = t("orders.activity.events.edit.confirmed", { editId })
      } else if (edit.status === "declined") {
        editTitle = t("orders.activity.events.edit.declined", { editId })
      } else if (edit.status === "canceled") {
        editTitle = t("orders.activity.events.edit.canceled", { editId })
      } else {
        editTitle = t("orders.activity.events.edit.pending", { editId })
      }

      const timestamp = 
        edit.status === "requested"
          ? edit.requested_at
          : edit.status === "confirmed"
            ? edit.confirmed_at
            : edit.status === "declined"
              ? edit.declined_at
              : edit.status === "canceled"
                ? edit.canceled_at
                : edit.created_at

      items.push({
        title: editTitle,
        timestamp: timestamp,
        children: isConfirmed ? <OrderEditBody edit={edit} /> : null,
      })
    }

    for (const transfer of orderChanges.filter(
      (oc) => oc.change_type === "transfer"
    )) {
      if (transfer.requested_at) {
        items.push({
          title: t(`orders.activity.events.transfer.requested`, {
            transferId: transfer.id.slice(-7),
          }),
          timestamp: transfer.requested_at,
          children: <TransferOrderRequestBody transfer={transfer} />,
        })
      }

      if (transfer.confirmed_at) {
        items.push({
          title: t(`orders.activity.events.transfer.confirmed`, {
            transferId: transfer.id.slice(-7),
          }),
          timestamp: transfer.confirmed_at,
        })
      }
      if (transfer.declined_at) {
        items.push({
          title: t(`orders.activity.events.transfer.declined`, {
            transferId: transfer.id.slice(-7),
          }),
          timestamp: transfer.declined_at,
        })
      }
    }

    for (const update of orderChanges.filter(
      (oc) => oc.change_type === "update_order"
    )) {
      const updateType = update.actions[0]?.details?.type
      if (updateType === "shipping_address") {
        const actionDetails = update.actions[0]?.details as Record<string, unknown> | undefined
        const oldAddress = actionDetails?.old as HttpTypes.AdminOrderAddress | null | undefined
        const newAddress = actionDetails?.new as HttpTypes.AdminOrderAddress | null | undefined

        items.push({
          title: (
            <ChangeDetailsTooltip
              title={t("orders.activity.events.update_order.shipping_address")}
              previous={getFormattedAddress({
                address: oldAddress,
              }).join(", ")}
              next={getFormattedAddress({
                address: newAddress,
              }).join(", ")}
            />
          ),
          timestamp: update.created_at,
          children: (
            <div className="text-ui-fg-subtle mt-2 flex gap-x-2 text-sm">
              {t("fields.by")} <By id={update.created_by || ""} />
            </div>
          ),
        })
      }

      if (updateType === "billing_address") {
        const actionDetails = update.actions[0]?.details as Record<string, unknown> | undefined
        const oldAddress = actionDetails?.old as HttpTypes.AdminOrderAddress | null | undefined
        const newAddress = actionDetails?.new as HttpTypes.AdminOrderAddress | null | undefined

        items.push({
          title: (
            <ChangeDetailsTooltip
              title={t("orders.activity.events.update_order.billing_address")}
              previous={getFormattedAddress({
                address: oldAddress,
              }).join(", ")}
              next={getFormattedAddress({
                address: newAddress,
              }).join(", ")}
            />
          ),
          timestamp: update.created_at,
          children: (
            <div className="text-ui-fg-subtle mt-2 flex gap-x-2 text-sm">
              {t("fields.by")} <By id={update.created_by || ""} />
            </div>
          ),
        })
      }

      if (updateType === "email") {
        const actionDetails = update.actions[0]?.details as Record<string, unknown> | undefined
        const oldEmail = actionDetails?.old as string | null | undefined
        const newEmail = actionDetails?.new as string | null | undefined

        items.push({
          title: (
            <ChangeDetailsTooltip
              title={t("orders.activity.events.update_order.email")}
              previous={oldEmail || ""}
              next={newEmail || ""}
            />
          ),
          timestamp: update.created_at,
          children: (
            <div className="text-ui-fg-subtle mt-2 flex gap-x-2 text-sm">
              {t("fields.by")} <By id={update.created_by || ""} />
            </div>
          ),
        })
      }
    }

    // for (const note of notes || []) {
    //   items.push({
    //     title: t("orders.activity.events.note.comment"),
    //     timestamp: note.created_at,
    //     children: <NoteBody note={note} />,
    //   })
    // }

    if (order.canceled_at) {
      items.push({
        title: t("orders.activity.events.canceled.title"),
        timestamp: order.canceled_at
      })
    }

    const sortedActivities = items.sort((a, b) => {
      const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0

      return timestampB - timestampA
    })

    const createdAt = {
      title: t("orders.activity.events.placed.title"),
      timestamp: order.created_at,
      children: (
        <Text size="small" className="text-ui-fg-subtle">
          {getStylizedAmount(order.total, order.currency_code)}
        </Text>
      ),
    }

    return [...sortedActivities, createdAt]
  }, [
    order,
    payments,
    returns,
    exchanges,
    orderChanges,
    notes,
    isLoading,
    itemsMap,
  ])
}

type OrderActivityItemProps = PropsWithChildren<{
  title: string | ReactNode
  timestamp: string | Date | null
  isFirst?: boolean
  itemsToSend?:
    | ExtendedAdminClaim["additional_items"]
    | ExtendedAdminExchange["additional_items"]
  itemsToReturn?: ExtendedAdminReturn["items"]
  itemsMap?: Map<string, ExtendedAdminOrderLineItem>
}>

const OrderActivityItem = ({
  title,
  timestamp,
  isFirst = false,
  children,
  itemsToSend,
  itemsToReturn,
  itemsMap,
}: OrderActivityItemProps) => {
  const { getFullDate, getRelativeDate } = useDate()

  return (
    <div className="grid grid-cols-[20px_1fr] items-start gap-2">
      <div className="flex size-full flex-col items-center gap-y-0.5">
        <div className="flex size-5 items-center justify-center">
          <div className="bg-ui-bg-base shadow-borders-base flex size-2.5 items-center justify-center rounded-full">
            <div className="bg-ui-tag-neutral-icon size-1.5 rounded-full" />
          </div>
        </div>
        {!isFirst && <div className="bg-ui-border-base w-px flex-1" />}
      </div>
      <div
        className={clx({
          "pb-4": !isFirst,
        })}
      >
        <div className="flex items-center justify-between">
          {(itemsToSend?.length || itemsToReturn?.length) && typeof title === "string" ? (
            <ActivityItems
              key={title}
              title={title}
              itemsToSend={itemsToSend}
              itemsToReturn={itemsToReturn}
              itemsMap={itemsMap}
            />
          ) : (
            <Text size="small" leading="compact" weight="plus">
              {title}
            </Text>
          )}
          {timestamp && (
            <Tooltip
              content={getFullDate({ date: timestamp, includeTime: true })}
            >
              <Text
                size="small"
                leading="compact"
                className="text-ui-fg-subtle text-right"
              >
                {getRelativeDate(timestamp)}
              </Text>
            </Tooltip>
          )}
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}

const OrderActivityCollapsible = ({
  activities,
}: {
  activities: Activity[]
}) => {
  const [open, setOpen] = useState(false)

  const { t } = useTranslation()

  if (!activities.length) {
    return null
  }

  return (
    <RadixCollapsible.Root open={open} onOpenChange={setOpen}>
      {!open && (
        <div className="grid grid-cols-[20px_1fr] items-start gap-2">
          <div className="flex size-full flex-col items-center">
            <div className="border-ui-border-strong w-px flex-1 bg-[linear-gradient(var(--border-strong)_33%,rgba(255,255,255,0)_0%)] bg-[length:1px_3px] bg-right bg-repeat-y" />
          </div>
          <div className="pb-4">
            <RadixCollapsible.Trigger className="text-left">
              <Text
                size="small"
                leading="compact"
                weight="plus"
                className="text-ui-fg-muted"
              >
                {t("orders.activity.showMoreActivities", {
                  count: activities.length,
                })}
              </Text>
            </RadixCollapsible.Trigger>
          </div>
        </div>
      )}
      <RadixCollapsible.Content>
        <div className="flex flex-col gap-y-0.5">
          {activities.map((item, index) => {
            return (
              <OrderActivityItem
                key={index}
                title={item.title}
                timestamp={item.timestamp}
                itemsToSend={item.itemsToSend}
                itemsToReturn={item.itemsToReturn}
                itemsMap={item.itemsMap}
              >
                {item.children}
              </OrderActivityItem>
            )
          })}
        </div>
      </RadixCollapsible.Content>
    </RadixCollapsible.Root>
  )
}

/**
 * TODO: Add once notes are supported.
 */
// const NoteBody = ({ note }: { note: Note }) => {
//   const { t } = useTranslation()
//   const prompt = usePrompt()

//   const { first_name, last_name, email } = note.author || {}
//   const name = [first_name, last_name].filter(Boolean).join(" ")

//   const byLine = t("orders.activity.events.note.byLine", {
//     author: name || email,
//   })

//   const { mutateAsync } = {} // useAdminDeleteNote(note.id)

//   const handleDelete = async () => {
//     const res = await prompt({
//       title: t("general.areYouSure"),
//       description: "This action cannot be undone",
//       confirmText: t("actions.delete"),
//       cancelText: t("actions.cancel"),
//     })

//     if (!res) {
//       return
//     }

//     await mutateAsync()
//   }

//   return (
//     <div className="flex flex-col gap-y-2 pt-2">
//       <div className="bg-ui-bg-component shadow-borders-base group grid grid-cols-[1fr_20px] items-start gap-x-2 text-pretty rounded-r-2xl rounded-bl-md rounded-tl-xl px-3 py-1.5">
//         <div className="flex h-full min-h-7 items-center">
//           <Text size="xsmall" className="text-ui-fg-subtle">
//             {note.value}
//           </Text>
//         </div>
//         <IconButton
//           size="small"
//           variant="transparent"
//           className="transition-fg invisible opacity-0 group-hover:visible group-hover:opacity-100"
//           type="button"
//           onClick={handleDelete}
//         >
//           <span className="sr-only">
//             {t("orders.activity.comment.deleteButtonText")}
//           </span>
//           <XMarkMini className="text-ui-fg-muted" />
//         </IconButton>
//       </div>
//       <Link
//         to={`/settings/users/${note.author_id}`}
//         className="text-ui-fg-subtle hover:text-ui-fg-base transition-fg w-fit"
//       >
//         <Text size="small">{byLine}</Text>
//       </Link>
//     </div>
//   )
// }

const FulfillmentCreatedBody = ({
  fulfillment,
}: {
  fulfillment: ExtendedAdminOrderFulfillment
}) => {
  const { t } = useTranslation()

  const numberOfItems = fulfillment.items.reduce((acc, item) => {
    return acc + item.quantity
  }, 0)

  return (
    <div>
      <Text size="small" className="text-ui-fg-subtle">
        {t("orders.activity.events.fulfillment.items", {
          count: numberOfItems,
        })}
      </Text>
    </div>
  )
}

const ReturnBody = ({
  orderReturn,
  isCreated,
  isReceived,
}: {
  orderReturn: ExtendedAdminReturn
  isCreated: boolean
  isReceived?: boolean
}) => {
  const prompt = usePrompt()
  const { t } = useTranslation()

  const { mutateAsync: cancelReturnRequest } = useCancelReturn(
    orderReturn.id,
    orderReturn.order_id
  )

  const onCancel = async () => {
    const res = await prompt({
      title: t("orders.returns.cancel.title"),
      description: t("orders.returns.cancel.description"),
      confirmText: t("actions.confirm"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    await cancelReturnRequest().catch((error) => {
      toast.error(error.message)
    })
  }

  const numberOfItems = (orderReturn.items || []).reduce((acc, item) => {
    return acc + (isReceived ? item.received_quantity : item.quantity) // TODO: revisit when we add dismissed quantity on ReturnItem
  }, 0)

  return (
    <div className="flex items-start gap-1">
      <Text size="small" className="text-ui-fg-subtle">
        {t("orders.activity.events.return.items", {
          count: numberOfItems,
        })}
      </Text>
      {isCreated && (
        <>
          <div className="mt-[2px] flex items-center leading-none">⋅</div>
          <Button
            onClick={onCancel}
            className="text-ui-fg-subtle h-auto px-0 leading-none hover:bg-transparent"
            variant="transparent"
            size="small"
          >
            {t("actions.cancel")}
          </Button>
        </>
      )}
    </div>
  )
}

const ClaimBody = ({
  claim,
  claimReturn,
}: {
  claim: ExtendedAdminClaim
  claimReturn?: ExtendedAdminReturn
}) => {
  const prompt = usePrompt()
  const { t } = useTranslation()

  const isCanceled = !!claim.created_at

  const { mutateAsync: cancelClaim } = useCancelClaim(claim.id, claim.order_id)

  const onCancel = async () => {
    const res = await prompt({
      title: t("orders.claims.cancel.title"),
      description: t("orders.claims.cancel.description"),
      confirmText: t("actions.confirm"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    await cancelClaim().catch((error) => {
      toast.error(error.message)
    })
  }

  const outboundItems = (claim.additional_items || []).reduce(
    (acc, item) => (acc + item.quantity) as number,
    0
  )

  const inboundItems = (claimReturn?.items || []).reduce(
    (acc, item) => acc + item.quantity,
    0
  )

  return (
    <div>
      {outboundItems > 0 && (
        <Text size="small" className="text-ui-fg-subtle">
          {t("orders.activity.events.claim.itemsInbound", {
            count: outboundItems,
          })}
        </Text>
      )}

      {inboundItems > 0 && (
        <Text size="small" className="text-ui-fg-subtle">
          {t("orders.activity.events.claim.itemsOutbound", {
            count: inboundItems,
          })}
        </Text>
      )}

      {!isCanceled && (
        <Button
          onClick={onCancel}
          className="text-ui-fg-subtle h-auto px-0 leading-none hover:bg-transparent"
          variant="transparent"
          size="small"
        >
          {t("actions.cancel")}
        </Button>
      )}
    </div>
  )
}

const ExchangeBody = ({
  exchange,
  exchangeReturn,
}: {
  exchange: ExtendedAdminExchange
  exchangeReturn?: ExtendedAdminReturn
}) => {
  const prompt = usePrompt()
  const { t } = useTranslation()

  const isCanceled = !!exchange.canceled_at

  const { mutateAsync: cancelExchange } = useCancelExchange(
    exchange.id,
    exchange.order_id
  )

  const onCancel = async () => {
    const res = await prompt({
      title: t("orders.exchanges.cancel.title"),
      description: t("orders.exchanges.cancel.description"),
      confirmText: t("actions.confirm"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    await cancelExchange().catch((error) => {
      toast.error(error.message)
    })
  }

  const outboundItems = (exchange.additional_items || []).reduce(
    (acc, item) => (acc + item.quantity) as number,
    0
  )

  const inboundItems = (exchangeReturn?.items || []).reduce(
    (acc, item) => acc + item.quantity,
    0
  )

  return (
    <div>
      {outboundItems > 0 && (
        <Text size="small" className="text-ui-fg-subtle">
          {t("orders.activity.events.exchange.itemsInbound", {
            count: outboundItems,
          })}
        </Text>
      )}

      {inboundItems > 0 && (
        <Text size="small" className="text-ui-fg-subtle">
          {t("orders.activity.events.exchange.itemsOutbound", {
            count: inboundItems,
          })}
        </Text>
      )}

      {!isCanceled && (
        <Button
          onClick={onCancel}
          className="text-ui-fg-subtle h-auto px-0 leading-none hover:bg-transparent"
          variant="transparent"
          size="small"
        >
          {t("actions.cancel")}
        </Button>
      )}
    </div>
  )
}

const OrderEditBody = ({ edit }: { edit: ExtendedAdminOrderChange }) => {
  const { t } = useTranslation()

  const [itemsAdded, itemsRemoved] = useMemo(
    () => countItemsChange(edit.actions),
    [edit]
  )

  return (
    <div>
      {itemsAdded > 0 && (
        <Text size="small" className="text-ui-fg-subtle">
          {t("labels.added")}: {itemsAdded}
        </Text>
      )}

      {itemsRemoved > 0 && (
        <Text size="small" className="text-ui-fg-subtle">
          {t("labels.removed")}: {itemsRemoved}
        </Text>
      )}
    </div>
  )
}

const TransferOrderRequestBody = ({
  transfer,
}: {
  transfer: ExtendedAdminOrderChange
}) => {
  const prompt = usePrompt()
  const { t } = useTranslation()

  const action = transfer.actions[0]
  const { customer } = useCustomer(action.reference_id)

  const isCompleted = !!transfer.confirmed_at

  const { mutateAsync: cancelTransfer } = useCancelOrderTransfer(
    transfer.order_id
  )

  const handleDelete = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: t("actions.cannotUndo"),
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    await cancelTransfer().catch((error) => {
      toast.error(error.message)
    })
  }

  /**
   * TODO: change original_email to customer info when action details is changed
   */

  return (
    <div>
      <Text size="small" className="text-ui-fg-subtle">
        {t("orders.activity.from")}: {(action.details as { original_email?: string })?.original_email || ""}
      </Text>

      <Text size="small" className="text-ui-fg-subtle">
        {t("orders.activity.to")}:{" "}
        {customer?.first_name
          ? `${customer?.first_name} ${customer?.last_name}`
          : customer?.email}
      </Text>
      {!isCompleted && (
        <Button
          onClick={handleDelete}
          className="text-ui-fg-subtle h-auto px-0 leading-none hover:bg-transparent"
          variant="transparent"
          size="small"
        >
          {t("actions.cancel")}
        </Button>
      )}
    </div>
  )
}

/**
 * Returns count of added and removed item quantity
 */
function countItemsChange(actions: ExtendedAdminOrderChange["actions"]) {
  let added = 0
  let removed = 0

  actions.forEach((action) => {
    if (action.action === "ITEM_ADD") {
      added += action.details!.quantity as number
    }
    if (action.action === "ITEM_UPDATE") {
      const quantityDiff = action.details!.quantity_diff as number

      if (quantityDiff > 0) {
        added += quantityDiff
      } else {
        removed += Math.abs(quantityDiff)
      }
    }
  })

  return [added, removed]
}

/**
 * Get IDs of missing line items that were removed from the order.
 */
function getMissingLineItemIds(order: ExtendedAdminOrder, changes: ExtendedAdminOrderChange[]) {
  if (!changes?.length) {
    return []
  }

  const retIds = new Set<string>()
  const existingItemsMap = new Map(order.items.map((item) => [item.id, true]))

  changes.forEach((change) => {
    change.actions.forEach((action) => {
      const referenceId = action.details?.reference_id
      if (!referenceId || typeof referenceId !== "string") {
        return
      }

      if (referenceId.startsWith("ordli_") && !existingItemsMap.has(referenceId)) {
        retIds.add(referenceId)
      }
    })
  })

  return Array.from(retIds)
}
