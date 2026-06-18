import React from 'react';
import { View, Text, Button, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';
import { useKtvStore } from '@/store/useKtvStore';

const PackagePage: React.FC = () => {
  const { packages, selectedPackage, setSelectedPackage } = useKtvStore();

  const handleSelect = (pkg) => {
    if (selectedPackage?.id === pkg.id) {
      setSelectedPackage(null);
      Taro.showToast({ title: '已取消选择', icon: 'none' });
    } else {
      setSelectedPackage(pkg);
      Taro.showToast({ title: '已选择套餐', icon: 'success' });
    }
    console.log('[Package] 选择套餐', { packageId: pkg.id });
  };

  const getDiscount = (price: number, originalPrice: number) => {
    const discount = Math.round((price / originalPrice) * 10);
    return `${discount}折`;
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>🍺 酒水套餐</Text>
        <Text className={styles.subtitle}>精选套餐，超值优惠，为您的欢唱时光助力</Text>
      </View>

      <View className={styles.packageList}>
        {packages.length > 0 ? (
          packages.map(pkg => (
            <View
              key={pkg.id}
              className={classnames(styles.packageCard, selectedPackage?.id === pkg.id && styles.selected)}
            >
              <View className={styles.imageContainer}>
                <Image
                  className={styles.packageImage}
                  src={pkg.image}
                  mode="aspectFill"
                  lazyLoad
                />
                {pkg.tag && (
                  <View className={styles.tag}>{pkg.tag}</View>
                )}
                {selectedPackage?.id === pkg.id && (
                  <View className={styles.selectedBadge}>✓ 已选择</View>
                )}
              </View>

              <View className={styles.content}>
                <View className={styles.packageHeader}>
                  <Text className={styles.packageName}>{pkg.name}</Text>
                </View>

                <Text className={styles.description}>{pkg.description}</Text>

                <View className={styles.items}>
                  {pkg.items.map((item, index) => (
                    <Text key={index} className={styles.itemTag}>
                      {item.name} ×{item.quantity}{item.unit}
                    </Text>
                  ))}
                </View>

                <View className={styles.footer}>
                  <View className={styles.priceSection}>
                    <Text className={styles.price}>¥{pkg.price}</Text>
                    <Text className={styles.originalPrice}>¥{pkg.originalPrice}</Text>
                    <View className={styles.discount}>
                      {getDiscount(pkg.price, pkg.originalPrice)}
                    </View>
                  </View>
                  <Button
                    className={classnames(styles.selectBtn, selectedPackage?.id === pkg.id && styles.selected)}
                    onClick={() => handleSelect(pkg)}
                  >
                    {selectedPackage?.id === pkg.id ? '已选择' : '选择套餐'}
                  </Button>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>🍻</Text>
            <Text className={styles.emptyText}>暂无套餐</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default PackagePage;
