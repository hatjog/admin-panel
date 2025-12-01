import { useEffect, useMemo } from "react";

import {
  Button,
  Drawer,
  Input,
  Label,
  Select,
  Switch,
  toast,
} from "@medusajs/ui";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Form } from "@components/common/form";
import { SwitchBox } from "@components/common/switch-box";
import { KeyboundForm } from "@components/utilities/keybound-form";

import { useProductCategories, useProductTypes, useStores } from "@hooks/api";
import { useCreateCommisionRule } from "@hooks/api/commission";
import { useSellers } from "@hooks/api/sellers";
import { useDocumentDirection } from "@hooks/use-document-direction";

type Props = {
  onSuccess?: () => void;
};

type Price = { amount: number; currency_code: string };

const ReferenceType = {
  SELLER: "seller",
  PRODUCT_TYPE: "product_type",
  PRODUCT_CATEGORY: "product_category",
  SELLER_PRODUCT_TYPE: "seller+product_type",
  SELLER_PRODUCT_CATEGORY: "seller+product_category",
} as const;

const RateType = {
  FLAT: "flat",
  PERCENTAGE: "percentage",
} as const;

type ReferenceTypeValue = (typeof ReferenceType)[keyof typeof ReferenceType];

const referenceRequirements = {
  needsSeller: (reference: ReferenceTypeValue) =>
    (
      [
        ReferenceType.SELLER,
        ReferenceType.SELLER_PRODUCT_TYPE,
        ReferenceType.SELLER_PRODUCT_CATEGORY,
      ] as ReferenceTypeValue[]
    ).includes(reference),
  needsType: (reference: ReferenceTypeValue) =>
    (
      [
        ReferenceType.PRODUCT_TYPE,
        ReferenceType.SELLER_PRODUCT_TYPE,
      ] as ReferenceTypeValue[]
    ).includes(reference),
  needsCategory: (reference: ReferenceTypeValue) =>
    (
      [
        ReferenceType.PRODUCT_CATEGORY,
        ReferenceType.SELLER_PRODUCT_CATEGORY,
      ] as ReferenceTypeValue[]
    ).includes(reference),
};

const validateReferenceFields = (
  data: {
    reference: ReferenceTypeValue;
    seller?: string;
    type?: string;
    category?: string;
  },
  ctx: z.RefinementCtx,
) => {
  if (referenceRequirements.needsSeller(data.reference) && !data.seller) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Seller is required for this rule type",
      path: ["seller"],
    });
  }

  if (referenceRequirements.needsType(data.reference) && !data.type) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Product type is required for this rule type",
      path: ["type"],
    });
  }

  if (referenceRequirements.needsCategory(data.reference) && !data.category) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Product category is required for this rule type",
      path: ["category"],
    });
  }
};

const validateRateFields = (
  data: {
    rateType: string;
    ratePercentValue?: number;
    rateFlatValue?: Record<string, number>;
  },
  ctx: z.RefinementCtx,
) => {
  if (data.rateType === RateType.PERCENTAGE && !data.ratePercentValue) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Percentage value is required",
      path: ["ratePercentValue"],
    });
  }

  if (data.rateType === RateType.FLAT) {
    if (!data.rateFlatValue || Object.keys(data.rateFlatValue).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one flat fee value is required",
        path: ["rateFlatValue"],
      });

      return;
    }

    const hasValidValue = Object.values(data.rateFlatValue).some(
      (value) => value > 0,
    );

    if (!hasValidValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one flat fee value must be greater than 0",
        path: ["rateFlatValue"],
      });
    }
  }
};

const CreateCommissionRuleSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    reference: z.enum([
      ReferenceType.SELLER,
      ReferenceType.PRODUCT_TYPE,
      ReferenceType.PRODUCT_CATEGORY,
      ReferenceType.SELLER_PRODUCT_TYPE,
      ReferenceType.SELLER_PRODUCT_CATEGORY,
    ]),
    seller: z.string().optional(),
    type: z.string().optional(),
    category: z.string().optional(),
    includeTax: z.boolean(),
    rateType: z.enum([RateType.FLAT, RateType.PERCENTAGE]),
    ratePercentValue: z.number().min(0).max(100).optional(),
    rateFlatValue: z.record(z.string(), z.number().min(0)).optional(),
    minCommissionEnabled: z.boolean(),
    minCommission: z.record(z.string(), z.number().min(0)).optional(),
    maxCommissionEnabled: z.boolean(),
    maxCommission: z.record(z.string(), z.number().min(0)).optional(),
  })
  .superRefine((data, ctx) => {
    validateReferenceFields(data, ctx);
    validateRateFields(data, ctx);
  });

type CreateCommissionRuleFormData = z.infer<typeof CreateCommissionRuleSchema>;

const CreateCommissionRuleForm = ({ onSuccess }: Props) => {
  const direction = useDocumentDirection();

  const { product_types } = useProductTypes({
    fields: "id,value",
    limit: 9999,
  });
  const { product_categories } = useProductCategories({
    fields: "id,name",
    limit: 9999,
  });
  const { sellers } = useSellers({ fields: "id,name", limit: 9999 });
  const { stores } = useStores();

  const currencies = useMemo(
    () => stores?.[0]?.supported_currencies.map((c) => c.currency_code) ?? [],
    [stores],
  );

  const form = useForm<CreateCommissionRuleFormData>({
    defaultValues: {
      name: "",
      reference: ReferenceType.SELLER,
      seller: "",
      type: "",
      category: "",
      includeTax: false,
      rateType: RateType.FLAT,
      ratePercentValue: 0,
      rateFlatValue: {},
      minCommissionEnabled: false,
      minCommission: {},
      maxCommissionEnabled: false,
      maxCommission: {},
    },
    resolver: zodResolver(CreateCommissionRuleSchema),
  });

  const reference = useWatch({ control: form.control, name: "reference" });
  const rateType = useWatch({ control: form.control, name: "rateType" });
  const minCommissionEnabled = useWatch({
    control: form.control,
    name: "minCommissionEnabled",
  });
  const maxCommissionEnabled = useWatch({
    control: form.control,
    name: "maxCommissionEnabled",
  });

  const showSellers = useMemo(
    () =>
      reference === ReferenceType.SELLER ||
      reference === ReferenceType.SELLER_PRODUCT_TYPE ||
      reference === ReferenceType.SELLER_PRODUCT_CATEGORY,
    [reference],
  );

  const showProductTypes = useMemo(
    () =>
      reference === ReferenceType.PRODUCT_TYPE ||
      reference === ReferenceType.SELLER_PRODUCT_TYPE,
    [reference],
  );

  const showProductCategories = useMemo(
    () =>
      reference === ReferenceType.PRODUCT_CATEGORY ||
      reference === ReferenceType.SELLER_PRODUCT_CATEGORY,
    [reference],
  );

  const { mutateAsync: createCommissionRule, isPending } =
    useCreateCommisionRule({});

  const handleSubmit = form.handleSubmit(async (data) => {
    const referenceIdParts: string[] = [];

    if (showSellers && data.seller) {
      referenceIdParts.push(data.seller);
    }
    if (showProductTypes && data.type) {
      referenceIdParts.push(data.type);
    }
    if (showProductCategories && data.category) {
      referenceIdParts.push(data.category);
    }

    const reference_id = referenceIdParts.join("+");

    const convertRecordToArray = (
      record: Record<string, number> | undefined,
    ): Price[] | undefined => {
      if (!record) return undefined;

      return Object.entries(record).map(([currency_code, amount]) => ({
        currency_code,
        amount,
      }));
    };

    const rule_payload = {
      name: data.name,
      reference: data.reference,
      reference_id,
      is_active: true,
      rate: {
        type: data.rateType,
        percentage_rate:
          data.rateType === RateType.PERCENTAGE
            ? data.ratePercentValue
            : undefined,
        include_tax: data.includeTax,
        price_set:
          data.rateType === RateType.FLAT
            ? convertRecordToArray(data.rateFlatValue)
            : undefined,
        min_price_set: data.minCommissionEnabled
          ? convertRecordToArray(data.minCommission)
          : undefined,
        max_price_set: data.maxCommissionEnabled
          ? convertRecordToArray(data.maxCommission)
          : undefined,
      },
    };

    await createCommissionRule(rule_payload, {
      onSuccess: () => {
        toast.success("Commission rule created successfully");
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create commission rule");
      },
    });
  });

  useEffect(() => {
    if (!showSellers) {
      form.setValue("seller", "");
    }
    if (!showProductTypes) {
      form.setValue("type", "");
    }
    if (!showProductCategories) {
      form.setValue("category", "");
    }
  }, [showSellers, showProductTypes, showProductCategories, form.setValue]);

  return (
    <Form {...form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <Drawer.Body className="flex flex-1 flex-col gap-y-4 overflow-y-auto">
          <Form.Field
            control={form.control}
            name="name"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>Rule Name</Form.Label>
                <Form.Control>
                  <Input {...field} placeholder="Enter rule name" />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />

          <Form.Field
            control={form.control}
            name="reference"
            render={({ field: { onChange, ref, ...field } }) => (
              <Form.Item>
                <Form.Label>Rule Type</Form.Label>
                <Form.Control>
                  <Select dir={direction} {...field} onValueChange={onChange}>
                    <Select.Trigger ref={ref}>
                      <Select.Value placeholder="Select rule type" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value={ReferenceType.SELLER}>
                        Seller
                      </Select.Item>
                      <Select.Item value={ReferenceType.PRODUCT_TYPE}>
                        Product type
                      </Select.Item>
                      <Select.Item value={ReferenceType.PRODUCT_CATEGORY}>
                        Product category
                      </Select.Item>
                      <Select.Item value={ReferenceType.SELLER_PRODUCT_TYPE}>
                        Seller + Product type
                      </Select.Item>
                      <Select.Item
                        value={ReferenceType.SELLER_PRODUCT_CATEGORY}
                      >
                        Seller + Product category
                      </Select.Item>
                    </Select.Content>
                  </Select>
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />

          {showSellers && sellers && (
            <Form.Field
              control={form.control}
              name="seller"
              render={({ field: { onChange, ref, ...field } }) => (
                <Form.Item>
                  <Form.Label>Seller</Form.Label>
                  <Form.Control>
                    <Select dir={direction} {...field} onValueChange={onChange}>
                      <Select.Trigger ref={ref}>
                        <Select.Value placeholder="Select seller" />
                      </Select.Trigger>
                      <Select.Content>
                        {sellers.map((s) => (
                          <Select.Item key={s.id} value={s.id}>
                            {s.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          )}

          {showProductCategories && product_categories && (
            <Form.Field
              control={form.control}
              name="category"
              render={({ field: { onChange, ref, ...field } }) => (
                <Form.Item>
                  <Form.Label>Product Category</Form.Label>
                  <Form.Control>
                    <Select dir={direction} {...field} onValueChange={onChange}>
                      <Select.Trigger ref={ref}>
                        <Select.Value placeholder="Select product category" />
                      </Select.Trigger>
                      <Select.Content>
                        {product_categories.map((c) => (
                          <Select.Item key={c.id} value={c.id}>
                            {c.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          )}

          {showProductTypes && product_types && (
            <Form.Field
              control={form.control}
              name="type"
              render={({ field: { onChange, ref, ...field } }) => (
                <Form.Item>
                  <Form.Label>Product Type</Form.Label>
                  <Form.Control>
                    <Select dir={direction} {...field} onValueChange={onChange}>
                      <Select.Trigger ref={ref}>
                        <Select.Value placeholder="Select product type" />
                      </Select.Trigger>
                      <Select.Content>
                        {product_types.map((t) => (
                          <Select.Item key={t.id} value={t.id}>
                            {t.value}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          )}

          <SwitchBox
            control={form.control}
            name="includeTax"
            label="Commission charged including tax"
            description="Enable if commission should include tax in calculations"
          />

          <Form.Field
            control={form.control}
            name="rateType"
            render={({ field: { onChange, value } }) => (
              <Form.Item>
                <Form.Label>Fee Type</Form.Label>
                <Form.Control>
                  <div className="flex items-center gap-x-2">
                    <Label>Flat fee</Label>
                    <Switch
                      checked={value === RateType.PERCENTAGE}
                      onCheckedChange={(checked) =>
                        onChange(checked ? RateType.PERCENTAGE : RateType.FLAT)
                      }
                    />
                    <Label>Percentage</Label>
                  </div>
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />

          {rateType === RateType.PERCENTAGE && (
            <Form.Field
              control={form.control}
              name="ratePercentValue"
              render={({ field: { onChange, value, ...field } }) => (
                <Form.Item>
                  <Form.Label>Percentage Value</Form.Label>
                  <Form.Control>
                    <Input
                      {...field}
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={value ?? 0}
                      onChange={(e) =>
                        onChange(parseFloat(e.target.value) || 0)
                      }
                      placeholder="Enter percentage (0-100)"
                    />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          )}

          {rateType === RateType.FLAT && currencies.length > 0 && (
            <Form.Field
              control={form.control}
              name="rateFlatValue"
              render={({ field: { value = {}, onChange } }) => (
                <Form.Item>
                  <Form.Label>Flat Fee Values</Form.Label>
                  <div className="flex flex-col gap-y-2">
                    {currencies.map((currency) => (
                      <div key={currency}>
                        <Label className="mb-1">{currency.toUpperCase()}</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={value[currency] ?? 0}
                          onChange={(e) =>
                            onChange({
                              ...value,
                              [currency]: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder={`Enter amount in ${currency.toUpperCase()}`}
                        />
                      </div>
                    ))}
                  </div>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          )}

          {rateType === RateType.PERCENTAGE && (
            <>
              <SwitchBox
                control={form.control}
                name="minCommissionEnabled"
                label="Minimum commission value"
                description="Set a minimum commission amount"
              />

              {minCommissionEnabled && currencies.length > 0 && (
                <Form.Field
                  control={form.control}
                  name="minCommission"
                  render={({ field: { value = {}, onChange } }) => (
                    <Form.Item>
                      <Form.Label>Minimum Commission Values</Form.Label>
                      <div className="flex flex-col gap-y-2">
                        {currencies.map((currency) => (
                          <div key={currency}>
                            <Label className="mb-1">{currency.toUpperCase()}</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={value[currency] ?? 0}
                              onChange={(e) =>
                                onChange({
                                  ...value,
                                  [currency]: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder={`Enter minimum in ${currency.toUpperCase()}`}
                            />
                          </div>
                        ))}
                      </div>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />
              )}

              <SwitchBox
                control={form.control}
                name="maxCommissionEnabled"
                label="Maximum commission value"
                description="Set a maximum commission amount"
              />

              {maxCommissionEnabled && currencies.length > 0 && (
                <Form.Field
                  control={form.control}
                  name="maxCommission"
                  render={({ field: { value = {}, onChange } }) => (
                    <Form.Item>
                      <Form.Label>Maximum Commission Values</Form.Label>
                      <div className="flex flex-col gap-y-2">
                        {currencies.map((currency) => (
                          <div key={currency}>
                            <Label className="mb-1">{currency.toUpperCase()}</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={value[currency] ?? 0}
                              onChange={(e) =>
                                onChange({
                                  ...value,
                                  [currency]: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder={`Enter maximum in ${currency.toUpperCase()}`}
                            />
                          </div>
                        ))}
                      </div>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />
              )}
            </>
          )}
        </Drawer.Body>

        <Drawer.Footer className="mt-8 flex items-center justify-end gap-x-2">
          <Button type="submit" isLoading={isPending} size="small">
            Create
          </Button>
        </Drawer.Footer>
      </KeyboundForm>
    </Form>
  );
};

export default CreateCommissionRuleForm;
