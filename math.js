export const math = (function() {
    return {
        // 범위 내 랜덤 실수값 생성
        rand_range: function(a, b) {
            return Math.random() * (b - a) + a;
        },
        
        // 가우시안 분포에 가까운 랜덤값
        rand_normalish: function() {
            const r = Math.random() + Math.random() + Math.random() + Math.random();
            return (r / 4.0) * 2.0 - 1;
        },
        
        // 범위 내 랜덤 정수값 생성
        rand_int: function(a, b) {
            return Math.round(Math.random() * (b - a) + a);
        },
        
        // 선형 보간
        lerp: function(x, a, b) {
            return x * (b - a) + a;
        },
        
        // 부드러운 보간
        smoothstep: function(x, a, b) {
            x = x * x * (3.0 - 2.0 * x);
            return x * (b - a) + a;
        },
        
        // 더 부드러운 보간
        smootherstep: function(x, a, b) {
            x = x * x * x * (x * (x * 6 - 15) + 10);
            return x * (b - a) + a;
        },
        
        // 값 범위 제한
        clamp: function(x, a, b) {
            return Math.min(Math.max(x, a), b);
        },
        
        // 0-1 사이로 값 제한
        sat: function(x) {
            return Math.min(Math.max(x, 0.0), 1.0);
        },
        
        // 범위 내 값인지 확인
        in_range: (x, a, b) => {
            return x >= a && x <= b;
        },
    };
})();
