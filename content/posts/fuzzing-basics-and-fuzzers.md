---
title: "Fuzzing 입문: 퍼징의 원리와 분야별 대표 Fuzzer"
date: "2026-11-25"
category: "development"
tags: ["Fuzzing", "Security", "Automotive", "CAN"]
excerpt: "퍼징의 개념과 종류, 분야별 대표 퍼저, 자동차 CAN 퍼징과 Custom Fuzzer 구현 방법을 정리한다."
example: false
featured: false
draft: false
---

## 들어가며

소프트웨어에는 개발자가 미처 예상하지 못한 버그가 존재할 수 있다. 단순히 기능이 제대로 작동하지 않는 문제도 있지만, 공격자가 이를 악용하면 정보 유출, 서비스 중단, 권한 상승과 같은 보안 사고로 이어질 수도 있다.

그러나 사람이 모든 입력값을 직접 만들어 프로그램을 검사하는 데에는 한계가 있다. 이러한 문제를 해결하기 위해 사용하는 자동화 테스트 기법이 바로 **Fuzzing**이다.

이번 글에서는 다음 내용을 중심으로 Fuzzing을 알아본다.

1. Fuzzing의 개념과 종류
2. Fuzzer의 동작 원리와 핵심 용어
3. 분야별 대표 Fuzzer와 차이점
4. 자동차 분야에서의 Fuzzing
5. Fuzzing 결과의 분석 과정

## Fuzzing이란?

**Fuzzing**은 프로그램에 비정상적이거나 예상하지 못한 입력을 반복적으로 전달하여 버그와 보안 취약점을 찾는 자동화된 소프트웨어 테스트 기법이다.

Fuzzing을 수행하는 도구를 **Fuzzer**라고 한다. Fuzzer는 입력을 자동으로 생성하거나 기존 입력을 변형한 뒤 프로그램에 전달하고, 실행 결과를 관찰한다.

예를 들어 이미지 파일을 처리하는 프로그램에 다음과 같은 입력을 계속 전달할 수 있다.

- 정상적인 이미지
- 파일 일부가 손상된 이미지
- 비정상적으로 큰 이미지
- 헤더가 제거된 이미지
- 길이 정보가 실제 데이터와 다른 이미지
- 특정 바이트가 무작위로 변경된 이미지

프로그램이 이러한 입력을 처리하다가 비정상 종료되거나 메모리 오류를 일으킨다면 Fuzzer는 해당 입력을 저장한다. 개발자는 저장된 입력을 사용하여 오류를 재현하고 원인을 분석할 수 있다.

## Fuzzing이 필요한 이유

일반적인 소프트웨어 테스트는 개발자가 예상한 상황을 중심으로 작성된다.

```text
올바른 사용자 이름 입력
정상적인 파일 업로드
올바른 형식의 네트워크 요청
```

반면 공격자는 정상적인 사용 방법만 따르지 않는다.

```text
지나치게 긴 문자열 입력
음수나 최댓값 전달
파일 구조 임의 변경
잘못된 패킷 순서 전송
예상하지 못한 데이터 형식 사용
```

사람이 이러한 입력을 모두 직접 작성하는 것은 어렵다. Fuzzer는 수많은 입력을 자동으로 생성하고 반복 실행하기 때문에 사람이 찾기 어려운 예외 상황을 발견하는 데 유용하다.

Fuzzing으로 탐지할 수 있는 대표적인 문제는 다음과 같다.

- Buffer Overflow
- Use-After-Free
- Double-Free
- Null Pointer Dereference
- 정수 Overflow
- 처리되지 않은 예외
- Assertion 실패
- 무한 반복 및 Timeout
- 과도한 메모리 사용
- 입력값 검증 누락

특히 파일 Parser, 네트워크 프로토콜, 웹 요청 처리 코드, 압축 라이브러리, 펌웨어, 차량 ECU처럼 외부 입력을 처리하는 프로그램이 중요한 Fuzzing 대상이다.

## Fuzzing의 종류

Fuzzing은 입력을 만드는 방법과 프로그램 내부 정보를 사용하는 정도에 따라 구분할 수 있다.

### 입력 생성 방식에 따른 분류

#### Mutation-based Fuzzing

기존 입력을 조금씩 변형하여 새로운 입력을 만드는 방식이다.

```text
정상 PNG 파일
    ↓
일부 비트 변경
일부 바이트 삭제
데이터 블록 추가
길이 값 변경
    ↓
변형된 PNG 파일
```

실제 입력 형식을 어느 정도 유지할 수 있으므로 이미지, 문서, 압축 파일처럼 구조가 복잡한 데이터를 테스트할 때 효과적이다.

대표적인 변형 방법은 다음과 같다.

- Bit Flip
- Byte 변경
- Byte 삽입 및 삭제
- 정수값 증가 또는 감소
- 데이터 블록 복사
- 서로 다른 입력 결합
- 의미 있는 문자열이나 토큰 삽입

#### Generation-based Fuzzing

입력 형식이나 프로토콜 문법을 바탕으로 데이터를 처음부터 생성하는 방식이다.

예를 들어 HTTP, JSON 또는 특정 네트워크 패킷의 구조를 알고 있다면 문법에 맞는 입력을 생성하면서 각 필드에 비정상적인 값을 넣을 수 있다.

Generation 방식은 유효한 구조를 유지하면서 다양한 조합을 만들 수 있지만, 입력 형식에 대한 사전 지식과 모델링 작업이 필요하다.

### 내부 정보 활용 정도에 따른 분류

| 방식 | 특징 | 장점 | 단점 |
| --- | --- | --- | --- |
| Black-box | 프로그램 내부 정보를 사용하지 않고 결과만 관찰 | 적용이 쉽고 소스 코드가 없어도 가능 | 깊은 실행 경로를 찾기 어려움 |
| Grey-box | Coverage 등 일부 실행 정보를 활용 | 실행 속도와 탐색 효율의 균형이 좋음 | 계측이나 별도 실행 환경이 필요할 수 있음 |
| White-box | 소스 분석과 Symbolic Execution 등을 활용 | 복잡한 조건을 논리적으로 탐색 가능 | 분석 비용과 자원 사용량이 큼 |

AFL++와 libFuzzer는 대표적인 **Coverage-guided Grey-box Fuzzer**다.

## Coverage-guided Fuzzing

### Coverage란?

**Coverage**는 테스트할 때 프로그램 코드가 얼마나 실행되었는지를 나타내는 지표다.

예를 들어 프로그램에 함수가 10개 있고 테스트 과정에서 7개가 실행되었다면, Function Coverage 관점에서는 전체 함수의 70%가 실행된 것이다.

Coverage는 측정 기준에 따라 다음과 같이 구분할 수 있다.

| 종류 | 의미 |
| --- | --- |
| Function Coverage | 전체 함수 중 실행된 함수의 비율 |
| Line Coverage | 전체 코드 줄 중 실행된 코드 줄의 비율 |
| Branch Coverage | `if`, `switch` 등의 분기가 실행된 정도 |
| Edge Coverage | 서로 다른 코드 실행 경로를 지난 정도 |

Coverage-guided Fuzzer는 이러한 정보를 이용해 어떤 입력이 새로운 코드를 실행했는지 판단한다.

### Coverage를 활용하는 방법

단순히 무작위 데이터를 계속 전달하면 대부분의 입력이 프로그램의 초기 검사 단계에서 거부된다.

예를 들어 다음 코드가 있다고 가정해 보자.

```c
if (data[0] == 'F') {
    if (data[1] == 'U') {
        if (data[2] == 'Z' && data[3] == 'Z') {
            vulnerable_function();
        }
    }
}
```

완전히 무작위인 입력으로 한 번에 `FUZZ`를 생성할 가능성은 높지 않다. Coverage-guided Fuzzer는 다음과 같은 방식으로 조건을 단계적으로 통과한다.

```text
무작위 입력 생성
    ↓
'F' 조건을 통과한 입력 발견
    ↓
새로운 코드를 실행했으므로 입력 저장
    ↓
저장된 'F' 입력을 다시 변형
    ↓
'FU' 조건 통과
    ↓
'FUZZ'까지 도달
```

새로운 코드 영역에 도달한 입력을 보존하고 다시 변형함으로써 점점 더 깊은 실행 경로를 탐색하는 것이다.

**Coverage가 높다는 것은 여러 코드 경로를 실행해 보았다는 뜻일 뿐, 프로그램에 버그가 없다는 뜻은 아니다.** 같은 코드도 입력값이나 실행 상태에 따라 서로 다른 문제가 발생할 수 있기 때문이다.

## Fuzzing의 핵심 용어

### Seed와 Corpus

**Seed**는 Fuzzing을 시작할 때 제공하는 초기 입력이다.

**Corpus**는 Fuzzer가 현재 보유하고 있는 유용한 입력 전체를 의미한다. 초기에는 Seed로 구성되지만, 새로운 Coverage를 발견한 입력이 계속 추가된다.

```text
Seed 입력
    ↓
초기 Corpus 구성
    ↓
Mutation 및 실행
    ↓
새로운 경로를 발견한 입력 추가
    ↓
Corpus 확장
```

### Harness

**Harness**는 Fuzzer가 만든 입력을 실제 테스트 대상 함수에 전달하는 연결 코드다.

libFuzzer에서는 일반적으로 다음과 같은 형태로 작성한다.

```cpp
int LLVMFuzzerTestOneInput(
    const uint8_t* data,
    size_t size
) {
    target_function(data, size);
    return 0;
}
```

좋은 Harness는 다음 조건을 만족해야 한다.

- 테스트 대상의 핵심 로직까지 입력을 전달한다.
- 입력 하나를 빠르게 처리한다.
- 불필요한 파일, 네트워크 및 UI 작업을 줄인다.
- 이전 실행 상태가 다음 실행에 영향을 주지 않는다.
- 잘못된 입력도 안전하게 처리한다.

### Sanitizer

Fuzzer는 비정상 종료를 탐지할 수 있지만, 모든 메모리 오류가 즉시 Crash로 나타나는 것은 아니다. 따라서 실행 중 오류를 탐지하는 **Sanitizer**를 함께 사용한다.

| Sanitizer | 주요 탐지 대상 |
| --- | --- |
| ASan | Buffer Overflow, Use-After-Free, Double-Free |
| UBSan | 정의되지 않은 동작, 잘못된 Shift, 정수 Overflow |
| MSan | 초기화되지 않은 메모리 사용 |
| TSan | 멀티스레드 Data Race |
| LSan | 메모리 누수 |

Sanitizer는 Fuzzer가 아니라 오류 탐지 도구다. Fuzzer와 함께 사용했을 때 숨겨진 메모리 문제를 더욱 효과적으로 발견할 수 있다.

## 분야별 대표 Fuzzer

Fuzzer는 모두 같은 방식으로 동작하지 않는다. 일반 프로그램, 라이브러리, 네트워크 서비스, 운영체제 커널처럼 테스트 대상에 따라 적합한 도구가 다르다.

### C/C++ 프로그램 분야: AFL++

**AFL++**는 C와 C++로 작성된 프로그램을 대상으로 널리 사용되는 Coverage-guided Grey-box Fuzzer다.

AFL++는 기존 입력을 변형하여 새로운 입력을 만들고, 해당 입력이 이전에 실행되지 않았던 코드 경로에 도달했는지 확인한다. 새로운 Coverage를 발견한 입력은 Corpus에 저장하고 다시 변형한다.

주요 특징은 다음과 같다.

- 프로그램 전체나 파일 Parser 테스트에 적합
- Mutation과 Coverage Feedback 사용
- 여러 프로세스를 이용한 병렬 Fuzzing 지원
- Corpus 최소화와 Crash 분석 도구 제공
- 소스 코드가 없는 바이너리를 테스트하는 방식도 지원

예를 들어 이미지 변환 프로그램이나 압축 해제 프로그램처럼 파일을 입력받아 실행되는 프로그램을 테스트할 때 사용할 수 있다.

### C/C++ 라이브러리 분야: libFuzzer

**libFuzzer**는 특정 함수나 라이브러리를 테스트하기 위한 In-process Coverage-guided Fuzzer다. 테스트 대상 코드와 Fuzzer 엔진을 하나의 실행 파일로 연결하여 사용한다.

주요 특징은 다음과 같다.

- 함수와 라이브러리 단위 테스트에 적합
- 프로세스를 반복해서 시작하지 않아 실행 속도가 빠름
- Clang 및 LLVM 환경과 결합하기 쉬움
- ASan이나 UBSan 같은 Sanitizer를 적용하기 편리함

JSON Parser나 이미지 디코더처럼 입력 데이터를 처리하는 특정 함수를 집중적으로 검사할 때 유용하다.

AFL++가 독립적으로 실행되는 프로그램 전체를 테스트하는 데 유용하다면, libFuzzer는 특정 함수를 직접 호출하여 빠르게 반복 테스트하는 데 적합하다는 차이가 있다.

### 관리형 언어 분야: Jazzer와 Atheris

Fuzzing은 C와 C++뿐만 아니라 Java와 Python에서도 사용할 수 있다.

**Jazzer**는 Java와 JVM 기반 프로그램을 대상으로 한다. Java로 작성된 Parser, 문자열 처리 코드, 웹 요청 처리 로직 등을 테스트할 수 있다.

**Atheris**는 Python 코드를 대상으로 한다. Python 함수에 변형된 입력을 반복적으로 전달하고 새로운 코드 경로나 처리되지 않은 예외를 발견한다.

| Fuzzer | 대상 언어 | 적합한 테스트 |
| --- | --- | --- |
| Jazzer | Java 및 JVM 언어 | Java 라이브러리, Parser, 웹 입력 처리 |
| Atheris | Python | Python 함수, 데이터 처리 및 역직렬화 코드 |

### 네트워크 프로토콜 분야: boofuzz

**boofuzz**는 네트워크 서비스와 프로토콜을 테스트하기 위한 Fuzzing 프레임워크다.

TCP나 UDP를 통해 변형된 패킷을 전송하고 대상 시스템의 응답이나 비정상 종료 여부를 관찰한다. 패킷 하나만 보내는 것이 아니라 여러 요청이 오가는 순서도 구성할 수 있다.

주요 특징은 다음과 같다.

- 네트워크 패킷 구조 정의 가능
- 패킷의 각 필드를 자동으로 변형
- TCP 및 UDP 기반 서비스 테스트 지원
- 요청과 응답의 순서를 모델링 가능
- 서버, 네트워크 장비 및 임베디드 장비 테스트에 적합

AFL++와 libFuzzer가 프로그램 내부 코드와 Coverage를 중심으로 동작한다면, boofuzz는 실제 네트워크 통신과 대상의 반응을 중심으로 테스트한다.

### 운영체제 커널 분야: syzkaller

**syzkaller**는 운영체제 커널을 대상으로 하는 Coverage-guided Fuzzer다.

일반 파일 대신 다양한 시스템 호출과 인수를 자동으로 생성하여 커널에 전달한다. 실행 중 발생하는 Kernel Panic, 메모리 오류, 교착 상태 등을 탐지한다.

주요 특징은 다음과 같다.

- 시스템 호출 조합 자동 생성
- 커널 Coverage 활용
- 가상 머신에서 반복 실행 가능
- 커널과 장치 드라이버 테스트에 적합
- Crash를 발생시킨 시스템 호출 순서 저장

syzkaller는 일반 애플리케이션보다 낮은 계층인 운영체제를 검사하기 위한 전문적인 Fuzzer다.

## 자동차 분야의 Fuzzing

### 자동차 Fuzzing의 대상

자동차에는 엔진, 브레이크, 조향 장치, 인포테인먼트 등을 제어하는 여러 ECU가 존재한다. ECU는 CAN, LIN, FlexRay, Automotive Ethernet 등의 차량 네트워크를 통해 통신한다.

자동차 분야의 Fuzzing에서는 차량 네트워크에 비정상적인 메시지나 진단 요청을 전송하고 ECU의 반응을 확인한다.

대표적인 테스트 대상은 다음과 같다.

- CAN 메시지의 ID, DLC 및 데이터
- UDS 진단 서비스와 파라미터
- ECU 펌웨어의 패킷 처리 코드
- 차량 게이트웨이의 메시지 전달 규칙
- Automotive Ethernet과 SOME/IP 서비스
- 인포테인먼트 시스템의 파일 및 네트워크 입력

예를 들어 CAN Fuzzing은 정상 메시지를 기반으로 Arbitration ID나 데이터 영역을 변형한 뒤 ECU가 정상적으로 처리하는지 확인한다.

```text
정상 CAN 메시지
    ↓
ID, 길이 또는 데이터 변형
    ↓
차량 네트워크에 전송
    ↓
ECU 응답과 차량 상태 관찰
    ↓
오류를 발생시킨 메시지 저장
```

자동차 Fuzzing에서는 일반 프로그램의 Crash뿐만 아니라 다음과 같은 현상도 확인해야 한다.

- ECU가 응답하지 않는 현상
- ECU Reset 또는 재부팅
- 비정상적인 진단 응답
- DTC 발생
- 메시지 처리 지연
- 통신 단절 또는 Bus-off
- 의도하지 않은 차량 기능 동작

### 오픈소스 도구: Caring Caribou

**Caring Caribou**는 자동차 CAN 네트워크의 보안 테스트와 탐색을 위한 오픈소스 도구다.

CAN Fuzzer 모듈을 통해 다음과 같은 테스트를 수행할 수 있다.

- 무작위 CAN 메시지 전송
- 지정된 범위의 메시지 Brute Force
- 선택한 데이터 영역 Mutation
- Fuzzing 결과 재생
- 특정 차량 반응을 발생시킨 메시지 식별
- UDS 및 DoIP 서비스 탐색

Caring Caribou는 CAN 통신을 대상으로 실습하거나 자동차 보안 테스트를 시작할 때 사용할 수 있는 대표적인 오픈소스 도구다. [Caring Caribou 공식 저장소](https://github.com/CaringCaribou/caringcaribou)

### 자동차 전용 상용 Fuzzer: ESCRYPT CycurFUZZ

**ESCRYPT CycurFUZZ**는 자동차 네트워크와 ECU를 대상으로 만들어진 전용 Fuzzer다.

CAN, UDS, SOME/IP, SOME/IP-SD, DoIP 등의 자동차 프로토콜을 대상으로 비정상적인 메시지를 생성하고 ECU의 반응을 검사할 수 있다. 실제 ECU뿐 아니라 가상 ECU를 대상으로 한 테스트에도 활용할 수 있다.

Caring Caribou가 CAN 네트워크 탐색과 오픈소스 실습에 적합하다면, CycurFUZZ는 ECU 개발 및 검증 과정에서 체계적인 자동차 프로토콜 Fuzzing을 수행하는 상용 도구에 가깝다. [ETAS ESCRYPT CycurFUZZ](https://www.etas.com/ww/en/products-services/cybersecurity-products/escrypt-cycurfuzz/)

### cantools와 Python을 이용한 Custom Fuzzer

기존 Fuzzer를 사용하지 않고 Python으로 목적에 맞는 **Custom Fuzzer**를 직접 만들 수도 있다.

이때 사용할 수 있는 대표적인 라이브러리가 `cantools`와 `python-can`이다.

- `cantools`: DBC 파일을 읽고 CAN 메시지와 신호를 인코딩하거나 디코딩한다.
- `python-can`: CAN 인터페이스에 연결하여 메시지를 송수신한다.
- Python 코드: 입력 생성, Mutation, 응답 감시, 결과 저장 등을 구현한다.

`cantools` 자체는 Fuzzer가 아니다. 하지만 DBC에 정의된 메시지 ID, 신호 위치, 자료형, 최솟값과 최댓값 등의 정보를 읽을 수 있으므로 구조를 유지한 CAN 메시지를 생성하는 데 활용할 수 있다. 실제 메시지 전송은 보통 `python-can`을 이용한다. [cantools 공식 문서](https://cantools.readthedocs.io/en/stable/), [python-can Bus API](https://python-can.readthedocs.io/en/stable/bus.html)

전체 흐름은 다음과 같다.

```text
DBC 파일 불러오기
    ↓
테스트할 메시지와 신호 선택
    ↓
경곗값·무작위 값 생성
    ↓
cantools로 CAN 데이터 인코딩
    ↓
python-can으로 메시지 전송
    ↓
ECU 응답과 상태 감시
    ↓
이상 반응을 발생시킨 입력 저장
```

DBC 정보를 사용하면 다음과 같은 신호 중심의 테스트를 만들 수 있다.

- 신호의 최솟값과 최댓값 입력
- 정상 범위의 무작위 값 입력
- 0 또는 경곗값 주변의 값 입력
- 특정 신호만 변경하고 나머지는 정상값으로 유지
- 여러 신호의 조합 변경
- 메시지 전송 주기 변경

DBC에 맞는 정상적인 구조를 유지하면서 특정 신호를 테스트하는 방식을 **Signal-aware Fuzzing**이라고 볼 수 있다.

반대로 CAN 데이터의 비트나 바이트를 직접 변경하면 DBC에 정의되지 않은 비정상적인 Raw 메시지도 만들 수 있다.

```text
Signal-aware Fuzzing
→ DBC 구조를 유지하면서 신호 값을 변경

Raw Fuzzing
→ CAN 데이터의 비트와 바이트를 직접 변경
```

Custom Fuzzer는 테스트할 메시지와 신호, 입력 생성 규칙, ECU 이상 판단 기준을 자유롭게 정할 수 있다는 장점이 있다. 반면 입력 스케줄링, 결과 기록, ECU 복구, Timeout 처리, 중복 오류 분류 등의 기능도 직접 구현해야 한다.

### 자동차 Fuzzing 도구 비교

| 도구 | 구분 | 주요 용도 |
| --- | --- | --- |
| Caring Caribou | 오픈소스 자동차 보안 도구 | CAN 메시지 Fuzzing과 UDS·DoIP 탐색 |
| ESCRYPT CycurFUZZ | 자동차 전용 상용 Fuzzer | CAN, UDS, SOME/IP, DoIP 기반 ECU Fuzzing |
| cantools + python-can | Custom Fuzzer 개발 환경 | DBC 기반 CAN 입력 생성과 메시지 송수신 |

실제 차량에서 무작위 메시지를 전송하면 ECU와 차량 기능에 예상하지 못한 영향을 줄 수 있다. 따라서 시뮬레이터, 가상 ECU, 테스트 벤치 또는 HIL 환경에서 먼저 검증하고, 허가된 환경에서만 수행해야 한다.

## 분야별 Fuzzer 비교

| 테스트 분야 | 대표 Fuzzer 또는 도구 | 주요 대상 | 특징 |
| --- | --- | --- | --- |
| 일반 프로그램 | AFL++ | C/C++ 프로그램과 바이너리 | 프로그램 전체 실행 및 Coverage 탐색 |
| 함수·라이브러리 | libFuzzer | C/C++ 함수와 라이브러리 | 빠른 In-process Fuzzing |
| 관리형 언어 | Jazzer, Atheris | Java, Python 코드 | 언어별 Coverage-guided Fuzzing |
| 네트워크 | boofuzz | 서버, 프로토콜, 장비 | 패킷 구조와 통신 순서 변형 |
| 운영체제 | syzkaller | 커널과 드라이버 | 시스템 호출 기반 커널 Fuzzing |
| 자동차 | Caring Caribou, CycurFUZZ | CAN, UDS, ECU | 차량 메시지와 진단 요청 변형 |
| 자동차 Custom Fuzzer | cantools, python-can | CAN 메시지와 신호 | DBC 기반 입력 생성 및 직접 구현 |

어떤 Fuzzer가 가장 우수하다고 단정할 수는 없다. 테스트 대상이 실행 파일인지, 라이브러리 함수인지, 네트워크 서비스인지에 따라 적절한 도구가 달라진다.

예를 들어 C++ 파일 Parser 전체를 검사한다면 AFL++를, Parser 내부의 특정 함수만 빠르게 반복 호출하려면 libFuzzer를 선택할 수 있다.

자동차 분야에서는 빠르게 CAN 네트워크를 탐색하고 싶다면 Caring Caribou를 사용할 수 있다. 특정 ECU와 신호에 맞춘 테스트가 필요하다면 `cantools`와 `python-can`으로 Custom Fuzzer를 구현할 수 있다.

## Fuzzer의 전체 동작 과정

Fuzzer의 일반적인 동작 과정은 다음과 같다.

```text
테스트 대상 선정
    ↓
Harness 작성
    ↓
Coverage 계측 및 Sanitizer 적용
    ↓
Seed Corpus 준비
    ↓
입력 선택 및 Mutation
    ↓
테스트 대상 실행
    ↓
Coverage와 오류 확인
    ↓
새로운 경로는 Corpus에 저장
오류 입력은 Crash로 저장
    ↓
반복 실행
```

먼저 외부 입력을 처리하는 함수나 프로그램을 테스트 대상으로 선택한다. 이후 Fuzzer의 입력을 대상에 전달할 Harness를 작성하고 Coverage 계측과 Sanitizer를 적용한다.

Fuzzer는 Corpus에서 입력을 선택한 뒤 비트 변경, 바이트 삽입 및 삭제 등의 Mutation을 수행한다. 변형된 입력을 실행했을 때 새로운 Coverage가 발견되면 해당 입력을 Corpus에 추가한다.

프로그램이 비정상 종료되거나 Sanitizer가 오류를 탐지하면 Fuzzer는 해당 입력을 Crash 파일로 저장한다.

자동차 Custom Fuzzer에서는 코드 Coverage를 직접 확인하기 어려울 수 있다. 이때는 ECU 응답, DTC, Reset, Timeout, 메시지 변화 등 외부에서 관찰할 수 있는 결과를 기준으로 이상 동작을 판단할 수 있다.

## Crash 발견 이후의 과정

Fuzzer가 Crash를 발견했다고 해서 분석이 끝난 것은 아니다.

```text
Crash 발견
    ↓
동일한 입력으로 재현
    ↓
입력 최소화
    ↓
중복 Crash 제거
    ↓
Stack Trace 분석
    ↓
Root Cause 확인
    ↓
보안 영향도 평가
    ↓
수정 및 회귀 테스트
```

먼저 저장된 입력으로 같은 문제가 반복되는지 확인해야 한다. 이후 Crash가 유지되는 범위에서 불필요한 데이터를 제거하면 원인 분석이 쉬워진다.

Crash가 여러 개 발견되었더라도 모두 서로 다른 버그라는 의미는 아니다. 같은 함수와 원인으로 발생한 Crash는 Stack Trace와 오류 위치를 기준으로 하나의 그룹으로 분류할 수 있다.

또한 발견된 문제가 단순한 안정성 버그인지 보안 취약점인지 판단해야 한다.

- 공격자가 입력을 제어할 수 있는가?
- 원격에서 오류를 유발할 수 있는가?
- 메모리 읽기나 쓰기가 가능한가?
- 서비스 중단으로 이어지는가?
- 인증 우회나 임의 코드 실행으로 발전할 수 있는가?

수정이 완료되면 기존 Crash 입력을 다시 실행하여 오류가 발생하지 않는지 확인한다. 해당 입력을 Corpus나 회귀 테스트에 추가하면 같은 문제가 다시 발생하는 것도 방지할 수 있다.

## 나의 경험

직접 Fuzzing 과정을 구성해 보면서 가장 어렵다고 느낀 점은 단순히 많은 입력을 보내는 것이 아니라, 그중에서 실제 이상 반응을 찾아내는 것이었다.

Fuzzer가 수많은 입력을 생성하더라도 프로그램이나 ECU가 항상 명확하게 Crash하는 것은 아니다. 응답 시간이 조금 길어지거나 특정 메시지에만 응답하지 않는 등 눈에 잘 띄지 않는 현상도 발생할 수 있다. 따라서 무엇을 이상 반응으로 판단할 것인지 기준을 정하고, 입력과 실행 결과를 빠짐없이 기록하는 과정이 중요했다.

이상 반응을 발견한 뒤에는 같은 현상을 다시 재현하는 것이 더욱 중요하다는 것을 알게 되었다. 처음에는 문제가 발생했더라도 같은 입력을 다시 보냈을 때 현상이 반복되지 않는 경우가 있었다. 입력값뿐만 아니라 ECU의 초기 상태, 이전에 전송된 메시지, 전송 순서와 간격 등이 결과에 영향을 줄 수 있기 때문이다.

따라서 이상 반응을 정확하게 재현하려면 다음 정보를 함께 기록해야 한다.

- 오류를 발생시킨 입력 데이터
- 입력이 전송된 순서
- 메시지 사이의 시간 간격
- 테스트 대상의 초기 상태
- 오류 발생 전후의 응답과 로그
- 사용한 프로그램과 테스트 환경

Fuzzing에서는 이상 반응을 한 번 발견하는 것만으로 충분하지 않다. 동일한 조건에서 문제를 반복해서 발생시킬 수 있어야 원인을 분석하고 실제 버그인지 판단할 수 있다.

이번 경험을 통해 Fuzzing에서 중요한 것은 무작위 입력을 많이 생성하는 것뿐만 아니라, 이상 반응을 정확히 감지하고 재현에 필요한 정보를 남기는 것이라는 점을 알게 되었다.

## 마무리

Fuzzing은 개발자가 예상하지 못한 입력을 자동으로 생성하고 실행하여 소프트웨어의 버그와 보안 취약점을 발견하는 기술이다.

핵심 과정은 다음과 같이 정리할 수 있다.

```text
Seed
  ↓
Corpus
  ↓
Mutation
  ↓
Harness
  ↓
Target 실행
  ↓
Coverage 및 Sanitizer 확인
  ↓
새 경로는 Corpus에 저장
오류 입력은 Crash로 저장
  ↓
반복
```

Fuzzing을 효과적으로 수행하려면 단순히 Fuzzer를 실행하는 것뿐만 아니라 테스트 대상에 적합한 Fuzzer를 선택하고, 좋은 Harness와 Seed를 준비해야 한다. 발견된 Crash를 재현하고 최소화하며 보안 영향도를 분석하는 후속 작업도 필요하다.

자동차 분야에서도 Fuzzing은 ECU, 차량 네트워크 및 진단 기능의 예상하지 못한 동작을 발견하는 데 활용할 수 있다. Caring Caribou와 같은 오픈소스 도구나 CycurFUZZ와 같은 자동차 전용 Fuzzer를 사용할 수 있으며, `cantools`와 `python-can`을 이용하여 필요한 기능을 갖춘 Custom Fuzzer를 직접 구현할 수도 있다.

Fuzzing은 모든 버그를 찾아주는 완벽한 방법은 아니지만, 사람이 직접 작성하기 어려운 수많은 테스트를 자동으로 수행할 수 있다는 점에서 소프트웨어 안정성과 보안을 향상시키는 강력한 테스트 기법이다.

