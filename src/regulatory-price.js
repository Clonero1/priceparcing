function finite(value) {
  return Number.isFinite(value) ? value : null;
}

function money(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function agePricingRule(age) {
  if (!Number.isFinite(age)) return null;
  if (age < 365) return { group: "<12 месяцев", costMultiplier: 1.3, marketDivisor: 1.15 };
  if (age < 730) return { group: "12-24 месяцев", costMultiplier: 1.2, marketDivisor: 1.2 };
  if (age < 1_095) return { group: "24-36 месяцев", costMultiplier: 1.1, marketDivisor: 1.3 };
  return { group: ">36 месяцев", costMultiplier: 1.05, marketDivisor: 1.5 };
}

export function calculateRegulatoryPrice({ age, cost, marketPrice }) {
  const normalizedCost = finite(cost);
  const normalizedMarket = finite(marketPrice);

  if (normalizedCost === null) {
    if (normalizedMarket === null || normalizedMarket <= 0) {
      return {
        price: null,
        reviewRequired: true,
        reason: "Нет себестоимости и цены рынка",
        rule: "manual",
      };
    }
    return {
      price: money(normalizedMarket / 1.1),
      reviewRequired: false,
      reason: "Нет себестоимости: цена на 10% ниже рынка",
      rule: "market_without_cost",
    };
  }

  const ageRule = agePricingRule(age);
  if (!ageRule) {
    return {
      price: null,
      reviewRequired: true,
      reason: "Не определён возраст товара",
      rule: "manual",
    };
  }

  const agePrice = money(normalizedCost * ageRule.costMultiplier);
  if (normalizedMarket === null || normalizedMarket <= 0) {
    return {
      price: agePrice,
      reviewRequired: true,
      reason: "Нет цены рынка: рассчитано по возрасту",
      rule: "cost_by_age_without_market",
    };
  }

  if (normalizedCost > normalizedMarket) {
    return {
      price: agePrice,
      reviewRequired: true,
      reason: "Себестоимость выше рынка",
      rule: "manual_cost_above_market",
    };
  }

  if (agePrice > normalizedMarket) {
    return {
      price: agePrice,
      reviewRequired: true,
      reason: "Цена по возрасту выше рынка",
      rule: "manual_price_above_market",
    };
  }

  const marketFloor = money(normalizedMarket / ageRule.marketDivisor);
  return {
    price: money(Math.max(agePrice, marketFloor)),
    reviewRequired: false,
    reason: agePrice < marketFloor
      ? "Применён минимальный рыночный предел"
      : "Цена по возрасту",
    rule: agePrice < marketFloor ? "market_floor" : "cost_by_age",
  };
}
