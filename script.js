function matrix() {
    // birinchi matritsa
    let ab2da12 = Number(document.getElementById('a12').value) || 0;
    let ab2da11 = Number(document.getElementById('a11').value) || 0;
    let ab2da13 = Number(document.getElementById('a13').value) || 0;
    let ab2da21 = Number(document.getElementById('a21').value) || 0;
    let ab2da22 = Number(document.getElementById('a22').value) || 0;
    let ab2da23 = Number(document.getElementById('a23').value) || 0;
    let ab2da31 = Number(document.getElementById('a31').value) || 0;
    let ab2da32 = Number(document.getElementById('a32').value) || 0;
    let ab2da33 = Number(document.getElementById('a33').value) || 0;

    // ikkinchi matritsa
    let ab2db11 = Number(document.getElementById('b11').value) || 0;
    let ab2db12 = Number(document.getElementById('b12').value) || 0;
    let ab2db13 = Number(document.getElementById('b13').value) || 0;
    let ab2db21 = Number(document.getElementById('b21').value) || 0;
    let ab2db22 = Number(document.getElementById('b22').value) || 0;
    let ab2db23 = Number(document.getElementById('b23').value) || 0;
    let ab2db31 = Number(document.getElementById('b31').value) || 0;
    let ab2db32 = Number(document.getElementById('b32').value) || 0;
    let ab2db33 = Number(document.getElementById('b33').value) || 0;

    // Matritsalar
    let A = [
        [ab2da11, ab2da12, ab2da13],
        [ab2da21, ab2da22, ab2da23],
        [ab2da31, ab2da32, ab2da33]
    ];

    let B = [
        [ab2db11, ab2db12, ab2db13],
        [ab2db21, ab2db22, ab2db23],
        [ab2db31, ab2db32, ab2db33]
    ];

    // Natija matritsa
    let C = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    
    document.getElementById('about').value = C[0][0];
    document.getElementById('about2').value = C[0][1];
    document.getElementById('about3').value = C[0][2];
    document.getElementById('about4').value = C[1][0];
    document.getElementById('about5').value = C[1][1];
    document.getElementById('about6').value = C[1][2];
    document.getElementById('about7').value = C[2][0];
    document.getElementById('about8').value = C[2][1];
    document.getElementById('about9').value = C[2][2];
}

function maksimovmatrix() {
    // U matritsasi
    let a111 = Number(document.getElementById('maksimova111').value) || 0;
    let a112 = Number(document.getElementById('maksimova112').value) || 0;
    let a113 = Number(document.getElementById('maksimova113').value) || 0;
    let a121 = Number(document.getElementById('maksimova121').value) || 0;
    let a122 = Number(document.getElementById('maksimova122').value) || 0;
    let a123 = Number(document.getElementById('maksimova123').value) || 0;
    let a131 = Number(document.getElementById('maksimova131').value) || 0;
    let a132 = Number(document.getElementById('maksimova132').value) || 0;
    let a133 = Number(document.getElementById('maksimova133').value) || 0;

    let U = [
        [a111, a112, a113],
        [a121, a122, a123],
        [a131, a132, a133]
    ];

    // H matritsasi
    let a211 = Number(document.getElementById('maksimova211').value) || 0;
    let a212 = Number(document.getElementById('maksimova212').value) || 0;
    let a213 = Number(document.getElementById('maksimova213').value) || 0;
    let a221 = Number(document.getElementById('maksimova221').value) || 0;
    let a222 = Number(document.getElementById('maksimova222').value) || 0;
    let a223 = Number(document.getElementById('maksimova223').value) || 0;
    let a231 = Number(document.getElementById('maksimova231').value) || 0;
    let a232 = Number(document.getElementById('maksimova232').value) || 0;
    let a233 = Number(document.getElementById('maksimova233').value) || 0;

    let H = [
        [a211, a212, a213],
        [a221, a222, a223],
        [a231, a232, a233]
    ];

    // F matritsasi
    let a311 = Number(document.getElementById('maksimova311').value) || 0;
    let a312 = Number(document.getElementById('maksimova312').value) || 0;
    let a313 = Number(document.getElementById('maksimova313').value) || 0;
    let a321 = Number(document.getElementById('maksimova321').value) || 0;
    let a322 = Number(document.getElementById('maksimova322').value) || 0;
    let a323 = Number(document.getElementById('maksimova323').value) || 0;
    let a331 = Number(document.getElementById('maksimova331').value) || 0;
    let a332 = Number(document.getElementById('maksimova332').value) || 0;
    let a333 = Number(document.getElementById('maksimova333').value) || 0;

    let F = [
        [a311, a312, a313],
        [a321, a322, a323],
        [a331, a332, a333]
    ];

    // B matritsasi
    let b111 = Number(document.getElementById('maksimovb111').value) || 0;
    let b112 = Number(document.getElementById('maksimovb112').value) || 0;
    let b113 = Number(document.getElementById('maksimovb113').value) || 0;
    let b121 = Number(document.getElementById('maksimovb121').value) || 0;
    let b122 = Number(document.getElementById('maksimovb122').value) || 0;
    let b123 = Number(document.getElementById('maksimovb123').value) || 0;
    let b131 = Number(document.getElementById('maksimovb131').value) || 0;
    let b132 = Number(document.getElementById('maksimovb132').value) || 0;
    let b133 = Number(document.getElementById('maksimovb133').value) || 0;

    let b211 = Number(document.getElementById('maksimovb211').value) || 0;
    let b212 = Number(document.getElementById('maksimovb212').value) || 0;
    let b213 = Number(document.getElementById('maksimovb213').value) || 0;
    let b221 = Number(document.getElementById('maksimovb221').value) || 0;
    let b222 = Number(document.getElementById('maksimovb222').value) || 0;
    let b223 = Number(document.getElementById('maksimovb223').value) || 0;
    let b231 = Number(document.getElementById('maksimovb231').value) || 0;
    let b232 = Number(document.getElementById('maksimovb232').value) || 0;
    let b233 = Number(document.getElementById('maksimovb233').value) || 0;

    let b311 = Number(document.getElementById('maksimovb311').value) || 0;
    let b312 = Number(document.getElementById('maksimovb312').value) || 0;
    let b313 = Number(document.getElementById('maksimovb313').value) || 0;
    let b321 = Number(document.getElementById('maksimovb321').value) || 0;
    let b322 = Number(document.getElementById('maksimovb322').value) || 0;
    let b323 = Number(document.getElementById('maksimovb323').value) || 0;
    let b331 = Number(document.getElementById('maksimovb331').value) || 0;
    let b332 = Number(document.getElementById('maksimovb332').value) || 0;
    let b333 = Number(document.getElementById('maksimovb333').value) || 0;

    // B matritsaning mos elementlarini yig'ish
    let Maksimov11 = b111 + b211 + b311;
    let Maksimov12 = b112 + b212 + b312;
    let Maksimov13 = b113 + b213 + b313;

    let Maksimov21 = b121 + b221 + b321;
    let Maksimov22 = b122 + b222 + b322;
    let Maksimov23 = b123 + b223 + b323;

    let Maksimov31 = b131 + b231 + b331;
    let Maksimov32 = b132 + b232 + b332;
    let Maksimov33 = b133 + b233 + b333;

    let Maksimov = [
        [Maksimov11, Maksimov12, Maksimov13],
        [Maksimov21, Maksimov22, Maksimov23],
        [Maksimov31, Maksimov32, Maksimov33]
    ];

    // Bo'sh matritsalar
    let Bir = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];
    let Ikki = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];
    let Uch = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                Bir[i][j] += U[i][k] * Maksimov[k][j];
            }
        }
    }
    
    document.getElementById('maksimovc111').value = Bir[0][0];
    document.getElementById('maksimovc112').value = Bir[0][1];
    document.getElementById('maksimovc113').value = Bir[0][2];
    document.getElementById('maksimovc121').value = Bir[1][0];
    document.getElementById('maksimovc122').value = Bir[1][1];
    document.getElementById('maksimovc123').value = Bir[1][2];
    document.getElementById('maksimovc131').value = Bir[2][0];
    document.getElementById('maksimovc132').value = Bir[2][1];
    document.getElementById('maksimovc133').value = Bir[2][2];
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                Ikki[i][j] += H[i][k] * Maksimov[k][j];
            }
        }
    }
    
    document.getElementById('maksimovc211').value = Ikki[0][0];
    document.getElementById('maksimovc212').value = Ikki[0][1];
    document.getElementById('maksimovc213').value = Ikki[0][2];
    document.getElementById('maksimovc221').value = Ikki[1][0];
    document.getElementById('maksimovc222').value = Ikki[1][1];
    document.getElementById('maksimovc223').value = Ikki[1][2];
    document.getElementById('maksimovc231').value = Ikki[2][0];
    document.getElementById('maksimovc232').value = Ikki[2][1];
    document.getElementById('maksimovc233').value = Ikki[2][2];
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                Uch[i][j] += F[i][k] * Maksimov[k][j];
            }
        }
    }
    
    document.getElementById('maksimovc311').value = Uch[0][0];
    document.getElementById('maksimovc312').value = Uch[0][1];
    document.getElementById('maksimovc313').value = Uch[0][2];
    document.getElementById('maksimovc321').value = Uch[1][0];
    document.getElementById('maksimovc322').value = Uch[1][1];
    document.getElementById('maksimovc323').value = Uch[1][2];
    document.getElementById('maksimovc331').value = Uch[2][0];
    document.getElementById('maksimovc332').value = Uch[2][1];
    document.getElementById('maksimovc333').value = Uch[2][2];
}

function ganimatrix() {
    let a111 = Number(document.getElementById('amaksimova111').value) || 0;
    let a112 = Number(document.getElementById('amaksimova112').value) || 0;
    let a113 = Number(document.getElementById('amaksimova113').value) || 0;
    let a121 = Number(document.getElementById('amaksimova121').value) || 0;
    let a122 = Number(document.getElementById('amaksimova122').value) || 0;
    let a123 = Number(document.getElementById('amaksimova123').value) || 0;
    let a131 = Number(document.getElementById('amaksimova131').value) || 0;
    let a132 = Number(document.getElementById('amaksimova132').value) || 0;
    let a133 = Number(document.getElementById('amaksimova133').value) || 0;

    let U = [
        [a111, a112, a113],
        [a121, a122, a123],
        [a131, a132, a133]
    ];

    // H matritsasi
    let a211 = Number(document.getElementById('amaksimova211').value) || 0;
    let a212 = Number(document.getElementById('amaksimova212').value) || 0;
    let a213 = Number(document.getElementById('amaksimova213').value) || 0;
    let a221 = Number(document.getElementById('amaksimova221').value) || 0;
    let a222 = Number(document.getElementById('amaksimova222').value) || 0;
    let a223 = Number(document.getElementById('amaksimova223').value) || 0;
    let a231 = Number(document.getElementById('amaksimova231').value) || 0;
    let a232 = Number(document.getElementById('amaksimova232').value) || 0;
    let a233 = Number(document.getElementById('amaksimova233').value) || 0;

    let H = [
        [a211, a212, a213],
        [a221, a222, a223],
        [a231, a232, a233]
    ];

    // F matritsasi
    let a311 = Number(document.getElementById('amaksimova311').value) || 0;
    let a312 = Number(document.getElementById('amaksimova312').value) || 0;
    let a313 = Number(document.getElementById('amaksimova313').value) || 0;
    let a321 = Number(document.getElementById('amaksimova321').value) || 0;
    let a322 = Number(document.getElementById('amaksimova322').value) || 0;
    let a323 = Number(document.getElementById('amaksimova323').value) || 0;
    let a331 = Number(document.getElementById('amaksimova331').value) || 0;
    let a332 = Number(document.getElementById('amaksimova332').value) || 0;
    let a333 = Number(document.getElementById('amaksimova333').value) || 0;

    let F = [
        [a311, a312, a313],
        [a321, a322, a323],
        [a331, a332, a333]
    ];

    // B matritsasi
    let b111 = Number(document.getElementById('amaksimovb111').value) || 0;
    let b112 = Number(document.getElementById('amaksimovb112').value) || 0;
    let b113 = Number(document.getElementById('amaksimovb113').value) || 0;
    let b121 = Number(document.getElementById('amaksimovb121').value) || 0;
    let b122 = Number(document.getElementById('amaksimovb122').value) || 0;
    let b123 = Number(document.getElementById('amaksimovb123').value) || 0;
    let b131 = Number(document.getElementById('amaksimovb131').value) || 0;
    let b132 = Number(document.getElementById('amaksimovb132').value) || 0;
    let b133 = Number(document.getElementById('amaksimovb133').value) || 0;

    let b211 = Number(document.getElementById('amaksimovb211').value) || 0;
    let b212 = Number(document.getElementById('amaksimovb212').value) || 0;
    let b213 = Number(document.getElementById('amaksimovb213').value) || 0;
    let b221 = Number(document.getElementById('amaksimovb221').value) || 0;
    let b222 = Number(document.getElementById('amaksimovb222').value) || 0;
    let b223 = Number(document.getElementById('amaksimovb223').value) || 0;
    let b231 = Number(document.getElementById('amaksimovb231').value) || 0;
    let b232 = Number(document.getElementById('amaksimovb232').value) || 0;
    let b233 = Number(document.getElementById('amaksimovb233').value) || 0;

    let b311 = Number(document.getElementById('amaksimovb311').value) || 0;
    let b312 = Number(document.getElementById('amaksimovb312').value) || 0;
    let b313 = Number(document.getElementById('amaksimovb313').value) || 0;
    let b321 = Number(document.getElementById('amaksimovb321').value) || 0;
    let b322 = Number(document.getElementById('amaksimovb322').value) || 0;
    let b323 = Number(document.getElementById('amaksimovb323').value) || 0;
    let b331 = Number(document.getElementById('amaksimovb331').value) || 0;
    let b332 = Number(document.getElementById('amaksimovb332').value) || 0;
    let b333 = Number(document.getElementById('amaksimovb333').value) || 0;
    
    //vekotorni kiritish
    let Vektor1 = Number(document.getElementById('vek1').value) || 0;
    let Vektor2 = Number(document.getElementById('vek2').value) || 0;
    let Vektor3 = Number(document.getElementById('vek3').value) || 0;

    // Birinchi qavatni Vektor bilan ko'paytirish
    let mtb = Vektor1 * b111;
    let mtb2 = Vektor1 * b112;
    let mtb3 = Vektor1 * b113;
    let mtb4 = Vektor1 * b121;
    let mtb5 = Vektor1 * b122;
    let mtb6 = Vektor1 * b123;
    let mtb7 = Vektor1 * b131;
    let mtb8 = Vektor1 * b132;
    let mtb9 = Vektor1 * b133;

    // Ikkinchi qavatni Vektor2 bilan ko'paytirish
    let mti = Vektor2 * b211;
    let mti2 = Vektor2 * b212;
    let mti3 = Vektor2 * b213;
    let mti4 = Vektor2 * b221;
    let mti5 = Vektor2 * b222;
    let mti6 = Vektor2 * b223;
    let mti7 = Vektor2 * b231;
    let mti8 = Vektor2 * b232;
    let mti9 = Vektor2 * b233;

    // Uchinchi qavatni Vektor3 bilan ko'paytirish
    let mtu = Vektor3 * b311;
    let mtu2 = Vektor3 * b312;
    let mtu3 = Vektor3 * b313;
    let mtu4 = Vektor3 * b321;
    let mtu5 = Vektor3 * b322;
    let mtu6 = Vektor3 * b323;
    let mtu7 = Vektor3 * b331;
    let mtu8 = Vektor3 * b332;
    let mtu9 = Vektor3 * b333;

    // B matritsaning mos elementlari yig'indisi
    let Gani11 = mtb + mti + mtu;
    let Gani12 = mtb2 + mti2 + mtu2;
    let Gani13 = mtb3 + mti3 + mtu3;

    let Gani21 = mtb4 + mti4 + mtu4;
    let Gani22 = mtb5 + mti5 + mtu5;
    let Gani23 = mtb6 + mti6 + mtu6;

    let Gani31 = mtb7 + mti7 + mtu7;
    let Gani32 = mtb8 + mti8 + mtu8;
    let Gani33 = mtb9 + mti9 + mtu9;

    let Gani = [
        [Gani11, Gani12, Gani13],
        [Gani21, Gani22, Gani23],
        [Gani31, Gani32, Gani33]
    ];

    let Bir = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];
    let Ikki = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];
    let Uch = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                Bir[i][j] += U[i][k] * Gani[k][j];
            }
        }
    }
    
    document.getElementById('amaksimovc111').value = Bir[0][0];
    document.getElementById('amaksimovc112').value = Bir[0][1];
    document.getElementById('amaksimovc113').value = Bir[0][2];
    document.getElementById('amaksimovc121').value = Bir[1][0];
    document.getElementById('amaksimovc122').value = Bir[1][1];
    document.getElementById('amaksimovc123').value = Bir[1][2];
    document.getElementById('amaksimovc131').value = Bir[2][0];
    document.getElementById('amaksimovc132').value = Bir[2][1];
    document.getElementById('amaksimovc133').value = Bir[2][2];
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                Ikki[i][j] += H[i][k] * Gani[k][j];
            }
        }
    }
    
    document.getElementById('amaksimovc211').value = Ikki[0][0];
    document.getElementById('amaksimovc212').value = Ikki[0][1];
    document.getElementById('amaksimovc213').value = Ikki[0][2];
    document.getElementById('amaksimovc221').value = Ikki[1][0];
    document.getElementById('amaksimovc222').value = Ikki[1][1];
    document.getElementById('amaksimovc223').value = Ikki[1][2];
    document.getElementById('amaksimovc231').value = Ikki[2][0];
    document.getElementById('amaksimovc232').value = Ikki[2][1];
    document.getElementById('amaksimovc233').value = Ikki[2][2];
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                Uch[i][j] += F[i][k] * Gani[k][j];
            }
        }
    }
    
    document.getElementById('amaksimovc311').value = Uch[0][0];
    document.getElementById('amaksimovc312').value = Uch[0][1];
    document.getElementById('amaksimovc313').value = Uch[0][2];
    document.getElementById('amaksimovc321').value = Uch[1][0];
    document.getElementById('amaksimovc322').value = Uch[1][1];
    document.getElementById('amaksimovc323').value = Uch[1][2];
    document.getElementById('amaksimovc331').value = Uch[2][0];
    document.getElementById('amaksimovc332').value = Uch[2][1];
    document.getElementById('amaksimovc333').value = Uch[2][2];
}

function up() {
    let A = [
        [Number(document.getElementById('sa11').value) || 0, Number(document.getElementById('sa12').value) || 0, Number(document.getElementById('sa13').value) || 0],
        [Number(document.getElementById('sa21').value) || 0, Number(document.getElementById('sa22').value) || 0, Number(document.getElementById('sa23').value) || 0],
        [Number(document.getElementById('sa31').value) || 0, Number(document.getElementById('sa32').value) || 0, Number(document.getElementById('sa33').value) || 0]
    ];
    
    let b = Number(document.getElementById('daraja').value);
    
    let C2 = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];

    let C3 = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];

    let C4 = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];

    let C5 = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                C2[i][j] += A[i][k] * A[k][j];
            }
        }
    }
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                C3[i][j] += C2[i][k] * A[k][j];
            }
        }
    }
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                C4[i][j] += C2[i][k] * C2[k][j];
            }
        }
    }
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                C5[i][j] += C4[i][k] * A[k][j];
            }
        }
    }
    
    if (b === 2) {
        document.getElementById('ja11').value = C2[0][0];
        document.getElementById('ja12').value = C2[0][1];
        document.getElementById('ja13').value = C2[0][2];
        document.getElementById('ja21').value = C2[1][0];
        document.getElementById('ja22').value = C2[1][1];
        document.getElementById('ja23').value = C2[1][2];
        document.getElementById('ja31').value = C2[2][0];
        document.getElementById('ja32').value = C2[2][1];
        document.getElementById('ja33').value = C2[2][2];
    } else if (b === 3) {
        document.getElementById('ja11').value = C3[0][0];
        document.getElementById('ja12').value = C3[0][1];
        document.getElementById('ja13').value = C3[0][2];
        document.getElementById('ja21').value = C3[1][0];
        document.getElementById('ja22').value = C3[1][1];
        document.getElementById('ja23').value = C3[1][2];
        document.getElementById('ja31').value = C3[2][0];
        document.getElementById('ja32').value = C3[2][1];
        document.getElementById('ja33').value = C3[2][2];
    } else if (b === 4) {
        document.getElementById('ja11').value = C4[0][0];
        document.getElementById('ja12').value = C4[0][1];
        document.getElementById('ja13').value = C4[0][2];
        document.getElementById('ja21').value = C4[1][0];
        document.getElementById('ja22').value = C4[1][1];
        document.getElementById('ja23').value = C4[1][2];
        document.getElementById('ja31').value = C4[2][0];
        document.getElementById('ja32').value = C4[2][1];
        document.getElementById('ja33').value = C4[2][2];
    } else if (b === 5) {
        document.getElementById('ja11').value = C5[0][0];
        document.getElementById('ja12').value = C5[0][1];
        document.getElementById('ja13').value = C5[0][2];
        document.getElementById('ja21').value = C5[1][0];
        document.getElementById('ja22').value = C5[1][1];
        document.getElementById('ja23').value = C5[1][2];
        document.getElementById('ja31').value = C5[2][0];
        document.getElementById('ja32').value = C5[2][1];
        document.getElementById('ja33').value = C5[2][2];
    } else {
        alert('Uzr! Hozircha faqat 2-5-darajagacha hisoblaymiz..');
    }
}
